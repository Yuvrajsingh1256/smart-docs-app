import { pool } from '../db.js';
import { embedText, generateAnswerStream } from '../services/gemini.js';

const SIMILARITY_THRESHOLD = 0.55;

export async function createSession(req, res) {
  const { documentId } = req.body;

  const doc = await pool.query('SELECT id FROM documents WHERE id = $1 AND user_id = $2', [
    documentId,
    req.userId,
  ]);
  if (doc.rows.length === 0) {
    return res.status(404).json({ error: 'Document not found' });
  }

  const result = await pool.query(
    'INSERT INTO chat_sessions (user_id, document_id) VALUES ($1, $2) RETURNING id',
    [req.userId, documentId]
  );
  res.status(201).json({ sessionId: result.rows[0].id });
}

export async function listSessions(req, res) {
  const result = await pool.query(
    `SELECT cs.id, cs.title, cs.created_at, d.original_name
     FROM chat_sessions cs
     JOIN documents d ON d.id = cs.document_id
     WHERE cs.user_id = $1
     ORDER BY cs.created_at DESC`,
    [req.userId]
  );
  res.json(result.rows);
}

export async function getMessages(req, res) {
  const session = await pool.query('SELECT id FROM chat_sessions WHERE id = $1 AND user_id = $2', [
    req.params.sessionId,
    req.userId,
  ]);
  if (session.rows.length === 0) {
    return res.status(404).json({ error: 'Chat session not found' });
  }

  const result = await pool.query(
    'SELECT role, content, sources, created_at FROM messages WHERE session_id = $1 ORDER BY created_at ASC',
    [req.params.sessionId]
  );
  res.json(result.rows);
}

function sendEvent(res, event, data) {
  // If the client already disconnected, res.write() would throw
  // ("write after end" / socket errors). Guard every write so a client
  // that navigated away can never take down the request, let alone the
  // whole process.
  if (res.writableEnded || res.destroyed) return;
  try {
    res.write(`event: ${event}\n`);
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  } catch (err) {
    console.error('Failed to write SSE event:', err.message);
  }
}

export async function sendMessage(req, res) {
  const { sessionId } = req.params;
  const { message } = req.body;

  if (!message || !message.trim()) {
    return res.status(400).json({ error: 'Message cannot be empty' });
  }

  // Everything is now inside one try/catch, including the session lookup.
  // A throw anywhere in here gets handled instead of becoming an
  // unhandled promise rejection that can crash the whole Node process.
  try {
    const sessionResult = await pool.query(
      'SELECT id, document_id FROM chat_sessions WHERE id = $1 AND user_id = $2',
      [sessionId, req.userId]
    );
    if (sessionResult.rows.length === 0) {
      return res.status(404).json({ error: 'Chat session not found' });
    }
    const { document_id: documentId } = sessionResult.rows[0];

    // Only switch to SSE mode once we know the request is valid - up to
    // this point we can still send a normal JSON error response.
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();


    await pool.query('INSERT INTO messages (session_id, role, content) VALUES ($1, $2, $3)', [
      sessionId,
      'user',
      message,
    ]);

    const queryEmbedding = await embedText(message);
    const embeddingLiteral = JSON.stringify(queryEmbedding);

    const searchResult = await pool.query(
      `SELECT content, 1 - (embedding <=> $1) AS similarity
       FROM chunks
       WHERE document_id = $2
       ORDER BY embedding <=> $1
       LIMIT 5`,
      [embeddingLiteral, documentId]
    );

    const relevantChunks = searchResult.rows.filter((r) => r.similarity >= SIMILARITY_THRESHOLD);
    console.log(`[chat] found ${relevantChunks.length} relevant chunks`);

    if (relevantChunks.length === 0) {
      const answer =
        "I couldn't find that in the uploaded document. Try rephrasing your question, or check that the document actually covers this topic.";

      sendEvent(res, 'sources', []);
      sendEvent(res, 'chunk', { text: answer });

      await pool.query(
        'INSERT INTO messages (session_id, role, content, sources) VALUES ($1, $2, $3, $4)',
        [sessionId, 'assistant', answer, JSON.stringify([])]
      );

      sendEvent(res, 'done', {});
      return res.end();
    }

    const sources = relevantChunks.map((c, i) => ({
      index: i + 1,
      excerpt: c.content.slice(0, 200) + (c.content.length > 200 ? '...' : ''),
      similarity: Number(Number(c.similarity).toFixed(3)),
    }));

    sendEvent(res, 'sources', sources);

    let fullAnswer = '';
    const stream = await generateAnswerStream({ question: message, contextChunks: relevantChunks });

    for await (const chunk of stream) {
      const delta = chunk.text;
      console.log('[chat] received chunk, length:', delta ? delta.length : 0);
      if (delta) {
        fullAnswer += delta;
        sendEvent(res, 'chunk', { text: delta });
      }
    }
    console.log('[chat] stream ended, total answer length:', fullAnswer.length);

    await pool.query(
      'INSERT INTO messages (session_id, role, content, sources) VALUES ($1, $2, $3, $4)',
      [sessionId, 'assistant', fullAnswer, JSON.stringify(sources)]
    );
    sendEvent(res, 'done', {});
    res.end();
  } catch (err) {
    console.error('sendMessage failed:', err);

    // Gemini's free tier caps requests per day/minute per model. Surface
    // this distinctly instead of a generic "something went wrong" -
    // it's a quota issue, not a bug, and the user should know that.
    const isRateLimit = err.status === 429 || err.message?.includes('RESOURCE_EXHAUSTED');
    const errorMessage = isRateLimit
      ? "I've hit the AI provider's rate limit for now. Please wait a minute and try again."
      : 'Something went wrong while generating a response';

    if (!res.headersSent) {
      res.status(isRateLimit ? 429 : 500).json({ error: errorMessage });
    } else {
      sendEvent(res, 'error', { message: errorMessage });
      res.end();
    }
  }
}