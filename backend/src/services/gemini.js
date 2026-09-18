import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

const EMBEDDING_MODEL = 'gemini-embedding-001';
// gemini-2.5-flash was deprecated for new users - Google's own API error
// pointed directly to gemini-3.6-flash as the current replacement.
// Model availability/quotas change fast; check your AI Studio dashboard
// (https://aistudio.google.com) for current free-tier limits on whatever
// model you land on.
const CHAT_MODEL = 'gemini-3.6-flash';

const EMBEDDING_DIMENSIONS = 768;

function normalize(vector) {
  const magnitude = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
  return vector.map((val) => val / magnitude);
}

export async function embedText(text, taskType = 'RETRIEVAL_QUERY') {
  const response = await ai.models.embedContent({
    model: EMBEDDING_MODEL,
    contents: text,
    config: {
      outputDimensionality: EMBEDDING_DIMENSIONS,
      taskType,
    },
  });

  return normalize(response.embeddings[0].values);
}

export async function embedBatch(texts, taskType = 'RETRIEVAL_DOCUMENT') {
  const response = await ai.models.embedContent({
    model: EMBEDDING_MODEL,
    contents: texts,
    config: {
      outputDimensionality: EMBEDDING_DIMENSIONS,
      taskType,
    },
  });

  return response.embeddings.map((embedding) => normalize(embedding.values));
}

// Shared prompt builder so the streaming and non-streaming paths never drift apart.
function buildPrompt(question, contextChunks) {
  const context = contextChunks
    .map((c, i) => `[Source ${i + 1}]\n${c.content}`)
    .join('\n\n');

  return `You are a helpful assistant that answers questions using ONLY the context provided below, which comes from a document the user uploaded.

Rules:
- Answer using only the information in the context.
- Use reasonable interpretation of the document structure when answering questions.
- If the user asks for the document title, identify the most prominent title or heading appearing at the beginning of the document.
- If the user asks what the document is, identify its type based on the provided content.
- If the answer cannot reasonably be determined from the context, say exactly: "I couldn't find that in the uploaded document." Do not use outside knowledge.
- When you use information from a source, cite it inline like [Source 1].
- Be concise and direct.

Context:
${context}

Question: ${question}

Answer:`;
}

// Non-streaming version - kept in case you want it for testing or a future
// non-chat feature (e.g. batch-summarizing a document on upload).
export async function generateAnswer({ question, contextChunks }) {
  const prompt = buildPrompt(question, contextChunks);
  const response = await ai.models.generateContent({
    model: CHAT_MODEL,
    contents: prompt,
  });
  return response.text;
}

// Streaming version used by the chat endpoint. Returns an async iterable -
// the caller does `for await (const chunk of stream) { chunk.text }`.
export async function generateAnswerStream({ question, contextChunks }) {
  const prompt = buildPrompt(question, contextChunks);
  return ai.models.generateContentStream({
    model: CHAT_MODEL,
    contents: prompt,
  });
}