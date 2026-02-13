import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config/env.js';

const JWT_SECRET = config.jwt.secret;

interface AuthPayload {
  userId: string;
  email: string;
}

export const authenticateToken = (req: Request, res: Response, next: NextFunction): void => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      res.status(401).json({ error: 'Access token required' });
      return;
    }

    jwt.verify(token, JWT_SECRET, (error, decoded) => {
      if (error) {
        res.status(403).json({ error: 'Invalid or expired token' });
        return;
      }

      // Attach user info to request
      (req as any).userId = (decoded as AuthPayload).userId;
      (req as any).email = (decoded as AuthPayload).email;
      
      next();
    });
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
