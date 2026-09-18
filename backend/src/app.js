import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';

import authRoutes from './routes/auth.routes.js';
import documentRoutes from './routes/documents.routes.js';
import chatRoutes from './routes/chat.routes.js';

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

const uploadsDir = path.join(process.cwd(), 'uploads');

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
}

app.use('/api/auth', authRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/chat', chatRoutes);

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Fallback error handler
app.use((err, req, res, next) => {
  console.error(err);

  res.status(400).json({
    error: err.message || 'Something went wrong',
  });
});

export default app;