import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import { createSession, listSessions, getMessages, sendMessage } from '../controllers/chatController.js';

const router = express.Router();

router.use(requireAuth);
router.post('/sessions', createSession);
router.get('/sessions', listSessions);
router.get('/sessions/:sessionId/messages', getMessages);
router.post('/sessions/:sessionId/messages', sendMessage);

export default router;
