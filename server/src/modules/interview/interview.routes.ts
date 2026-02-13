import { Router } from 'express';
import {
  createInterview,
  getInterviews,
  getInterviewById,
  updateInterviewStatus
} from './interview.controller.js';
import { authenticateToken } from '../../middleware/auth.middleware.js';

const router = Router();

// All routes require authentication
router.use(authenticateToken);

// Create new interview
router.post('/', createInterview);

// Get all interviews for logged-in user
router.get('/', getInterviews);

// Get specific interview by ID
router.get('/:id', getInterviewById);

// Update interview status
router.patch('/:id/status', updateInterviewStatus);

export default router;
