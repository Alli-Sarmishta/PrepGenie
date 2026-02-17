/**
 * Resume Analyzer Controller
 * Handles file upload, validation, and resume analysis requests
 */
import { Request, Response } from 'express';
import multer from 'multer';
import {
  extractResumeText,
  analyzeResumeWithAI,
  MAX_FILE_SIZE_BYTES,
  ALLOWED_MIME_TYPES,
  type ResumeAnalysisResult
} from './resume.service.js';

// Configure multer for memory storage (no disk writes for security)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE_BYTES },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only PDF and DOCX are allowed.'));
    }
  }
});

// Single file upload middleware
export const uploadResume = upload.single('resume');

/**
 * POST /api/resume/analyze
 * Upload resume file, extract text, and return AI analysis
 */
export const analyzeResume = async (req: Request, res: Response): Promise<void> => {
  try {
    const file = req.file;
    if (!file) {
      res.status(400).json({ error: 'No file uploaded. Please upload a PDF or DOCX resume.' });
      return;
    }

    // Validate file size (multer handles limit, but double-check)
    if (file.size > MAX_FILE_SIZE_BYTES) {
      res.status(400).json({ error: 'File too large. Maximum size is 5MB.' });
      return;
    }

    // Validate mime type
    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      res.status(400).json({ error: 'Invalid file type. Only PDF and DOCX files are allowed.' });
      return;
    }

    // Step 1: Extract text from file
    const extractedText = await extractResumeText(file.buffer, file.mimetype);

    if (!extractedText || extractedText.trim().length < 50) {
      res.status(400).json({
        error: 'Could not extract sufficient text from the file. Ensure the resume contains readable text (not scanned images).'
      });
      return;
    }

    // Step 2: Analyze with AI
    const analysis: ResumeAnalysisResult = await analyzeResumeWithAI(extractedText);

    res.json({ analysis });
  } catch (error) {
    console.error('Resume analysis error:', error);
    const message = error instanceof Error ? error.message : 'Failed to analyze resume';
    res.status(500).json({ error: message });
  }
};
