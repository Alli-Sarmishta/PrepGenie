/**
 * MCQ Controller
 * Generate MCQs from job description and submit answers for feedback
 */
import { Request, Response } from 'express';
import {
  generateMcqQuestions,
  submitMcqAnswers,
  generateMcqFeedback,
} from './mcq.service.js';

/**
 * POST /api/mcq/generate
 * Body: { jobDescription: string, jobTitle?: string }
 */
export async function generate(req: Request, res: Response): Promise<void> {
  try {
    const { jobDescription, jobTitle } = req.body;

    if (!jobDescription || typeof jobDescription !== 'string') {
      res.status(400).json({ error: 'Job description is required.' });
      return;
    }

    const trimmed = jobDescription.trim();
    if (trimmed.length < 20) {
      res.status(400).json({ error: 'Please enter a meaningful job description (at least 20 characters).' });
      return;
    }

    const result = await generateMcqQuestions(trimmed, jobTitle?.trim() || undefined);
    res.json(result);
  } catch (error) {
    console.error('MCQ generate error:', error);
    res.status(500).json({ error: 'Failed to generate questions. Please try again.' });
  }
}

/**
 * POST /api/mcq/submit
 * Body: { sessionId: string, answers: number[] }
 */
export async function submit(req: Request, res: Response): Promise<void> {
  try {
    const { sessionId, answers } = req.body;

    if (!sessionId || !Array.isArray(answers)) {
      res.status(400).json({ error: 'Session ID and answers array are required.' });
      return;
    }

    const payload = submitMcqAnswers(sessionId, answers);

    if (!payload) {
      res.status(404).json({ error: 'Session expired or invalid. Please generate questions again.' });
      return;
    }

    const { result, jobDescription, jobTitle } = payload;
    const feedback = await generateMcqFeedback(jobTitle, jobDescription, result);
    res.json({ ...result, feedback });
  } catch (error) {
    console.error('MCQ submit error:', error);
    res.status(500).json({ error: 'Failed to submit answers. Please try again.' });
  }
}
