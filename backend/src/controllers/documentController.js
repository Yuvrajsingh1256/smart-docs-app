import fs from 'fs';
import { pool } from '../db.js';
import { extractTextFromPDF } from '../services/pdfExtractor.js';
import { chunkText } from '../services/chunker.js';
import { embedBatch } from '../services/gemini.js';

const EMBED_BATCH_SIZE = 20;

export async function uploadDocument(req, res) {
  const userId = req.userId;
  const file = req.file;

  if (!file) {
    return res.status(400).json({ error: 'No file was uploaded' });
  }

  try {
    const insertResult = await pool.query(
      'INSERT INTO documents (user_id, filename, original_name, status) VALUES ($1, $2, $3, $4) RETURNING id',
      [userId, file.filename, file.originalname, 'processing']
    );
    const docId = insertResult.rows[0].id;

    // Respond immediately - embedding a whole PDF can take a while, and the
    // frontend polls document status instead of blocking on this request.
    res.status(202).json({ documentId: docId, status: 'processing' });

    processDocument(docId, file.path).catch(async (err) => {
      console.error('Document processing failed:', err);
      await pool.query('UPDATE documents SET status = $1 WHERE id = $2', ['failed', docId]);
    });
  } catch (err) {
    console.error(err);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Failed to start document processing' });
    }
  }
}

async function processDocument(docId, filePath) {
  const text = await extractTextFromPDF(filePath);

  if (!text || text.trim().length === 0) {
    throw new Error('No extractable text found in document');
  }

  const chunks = chunkText(text);

  for (let i = 0; i < chunks.length; i += EMBED_BATCH_SIZE) {
    const batch = chunks.slice(i, i + EMBED_BATCH_SIZE);
    const embeddings = await embedBatch(batch);

    for (let j = 0; j < batch.length; j++) {
      await pool.query(
        'INSERT INTO chunks (document_id, content, embedding, chunk_index) VALUES ($1, $2, $3, $4)',
        [docId, batch[j], JSON.stringify(embeddings[j]), i + j]
      );
    }
  }

  await pool.query('UPDATE documents SET status = $1 WHERE id = $2', ['ready', docId]);
  fs.unlink(filePath, () => {});
}

export async function listDocuments(req, res) {
  const result = await pool.query(
    'SELECT id, original_name, status, created_at FROM documents WHERE user_id = $1 ORDER BY created_at DESC',
    [req.userId]
  );
  res.json(result.rows);
}

export async function getDocumentStatus(req, res) {
  const result = await pool.query(
    'SELECT id, status FROM documents WHERE id = $1 AND user_id = $2',
    [req.params.id, req.userId]
  );

  if (result.rows.length === 0) {
    return res.status(404).json({ error: 'Document not found' });
  }
  res.json(result.rows[0]);
}

export async function deleteDocument(req, res) {
  const result = await pool.query(
    'DELETE FROM documents WHERE id = $1 AND user_id = $2 RETURNING id',
    [req.params.id, req.userId]
  );

  if (result.rows.length === 0) {
    return res.status(404).json({ error: 'Document not found' });
  }
  res.json({ success: true });
}
