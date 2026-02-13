import { Server as HTTPServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { handleInterviewConnection } from './interview.handler.js';

export const initWebSocketServer = (server: HTTPServer) => {
  const wss = new WebSocketServer({ server, path: '/ws' });

  console.log('✅ WebSocket server initialized');

  wss.on('connection', (ws: WebSocket, req) => {
    const timestamp = new Date().toISOString();
    console.log(`\n[${timestamp}] 🔗 NEW WebSocket connection from ${req.socket.remoteAddress}`);

    // Extract token from URL query params
    const url = new URL(req.url!, `http://${req.headers.host}`);
    const token = url.searchParams.get('token');

    console.log(`[${timestamp}] 🔑 Token present: ${!!token}`);

    if (!token) {
      console.log(`[${timestamp}] ❌ No token provided, closing connection`);
      ws.close(1008, 'Token required');
      return;
    }

    // Handle interview-related WebSocket communication
    try {
      handleInterviewConnection(ws, token);
      console.log(`[${timestamp}] ✅ Interview handler attached`);
    } catch (error) {
      console.error(`[${timestamp}] ❌ Error in handleInterviewConnection:`, error);
    }

    ws.on('close', () => {
      console.log(`[${new Date().toISOString()}] 🔌 WebSocket connection closed`);
    });

    ws.on('error', (error) => {
      console.error(`[${new Date().toISOString()}] ❌ WebSocket error:`, error);
    });
  });

  return wss;
};
