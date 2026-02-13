import { Router } from 'express';
import { signup, login, getProfile } from './auth.controller.js';
import { authenticateToken } from '../../middleware/auth.middleware.js';

const router = Router();

// Public routes
router.post('/signup', signup);
router.post('/login', login);

// Protected routes
router.get('/profile', authenticateToken, getProfile);

export default router;
