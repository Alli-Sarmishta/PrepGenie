import { Router } from 'express';
import { authenticateToken } from '../../middleware/auth.middleware.js';
import { generate, submit } from './mcq.controller.js';

const router = Router();

router.use(authenticateToken);

router.post('/generate', generate);
router.post('/submit', submit);

export default router;
