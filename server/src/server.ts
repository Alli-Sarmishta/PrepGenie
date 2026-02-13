import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { config } from './config/env.js';
import { initWebSocketServer } from './modules/websocket/websocket.server.js';
import authRoutes from './modules/auth/auth.routes.js';
import interviewRoutes from './modules/interview/interview.routes.js';

const app = express();
const PORT = config.server.port;

// Middleware
app.use(cors({
  origin: config.frontend.url,
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'PrepGenie Server is running' });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/interviews', interviewRoutes);

// Create HTTP server
const server = createServer(app);

// Initialize WebSocket server
initWebSocketServer(server);

// Start server
server.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📡 WebSocket server ready on ws://localhost:${PORT}`);
});

// Error handling
process.on('unhandledRejection', (error) => {
  console.error('Unhandled Rejection:', error);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});
