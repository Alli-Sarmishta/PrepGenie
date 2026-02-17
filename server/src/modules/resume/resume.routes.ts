/**
 * Resume Analyzer API Routes
 */
import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import { authenticateToken } from '../../middleware/auth.middleware.js';
import { uploadResume, analyzeResume } from './resume.controller.js';

const router = Router();

// All resume routes require authentication
router.use(authenticateToken);

// Error handler for multer (file too large, invalid type)
const handleMulterError = (err: unknown, _req: Request, res: Response, next: NextFunction) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      res.status(400).json({ error: 'File too large. Maximum size is 5MB.' });
      return;
    }
  }
  if (err instanceof Error && err.message.includes('Invalid file type')) {
    res.status(400).json({ error: err.message });
    return;
  }
  next(err);
};

// POST /api/resume/analyze - Upload and analyze resume
router.post('/analyze', uploadResume, handleMulterError, analyzeResume);

export default router;
