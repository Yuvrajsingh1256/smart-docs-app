import express from 'express';
import multer from 'multer';
import { requireAuth } from '../middleware/auth.js';
import {
  uploadDocument,
  listDocuments,
  getDocumentStatus,
  deleteDocument,
} from '../controllers/documentController.js';

const router = express.Router();

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`),
});

const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') cb(null, true);
    else cb(new Error('Only PDF files are supported'));
  },
});

router.use(requireAuth);
router.post('/upload', upload.single('file'), uploadDocument);
router.get('/', listDocuments);
router.get('/:id/status', getDocumentStatus);
router.delete('/:id', deleteDocument);

export default router;
