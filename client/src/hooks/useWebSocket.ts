import { useEffect, useRef, useState, useCallback } from 'react';
import { useAuthStore } from '../store/authStore';

const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:5001/ws';

interface UseWebSocketProps {
  onMessage?: (data: any) => void;
  onOpen?: () => void;
  onClose?: () => void;
  onError?: (error: Event) => void;
}

export const useWebSocket = ({
  onMessage,
  onOpen,
  onClose,
  onError,
}: UseWebSocketProps = {}) => {
  const [isConnected, setIsConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const token = useAuthStore((state) => state.token);
  const hasInitialized = useRef(false);
  
  // Store callbacks in refs to avoid dependency issues
  const onMessageRef = useRef(onMessage);
  const onOpenRef = useRef(onOpen);
  const onCloseRef = useRef(onClose);
  const onErrorRef = useRef(onError);
  
  // Update refs when callbacks change
  useEffect(() => {
    onMessageRef.current = onMessage;
    onOpenRef.current = onOpen;
    onCloseRef.current = onClose;
    onErrorRef.current = onError;
  }, [onMessage, onOpen, onClose, onError]);

  useEffect(() => {
    if (!token) {
      console.warn('⚠️ No token available for WebSocket connection');
      return;
    }

    // Prevent duplicate connections in StrictMode
    if (hasInitialized.current && wsRef.current?.readyState === WebSocket.OPEN) {
      console.log('⏭️ WebSocket already connected, skipping');
      return;
    }

    const timestamp = new Date().toISOString();
    console.log(`\n[${timestamp}] 🔌 CLIENT: Connecting to WebSocket...`);
    console.log(`[${timestamp}] 🌐 WS URL: ${WS_URL}`);
    console.log(`[${timestamp}] 🔑 Token: ${token.substring(0, 20)}...`);

    // Close existing connection if any
    if (wsRef.current) {
      wsRef.current.close();
    }

    // Connect to WebSocket with token
    const ws = new WebSocket(`${WS_URL}?token=${token}`);
    wsRef.current = ws;
    hasInitialized.current = true;

    ws.onopen = () => {
      console.log(`[${new Date().toISOString()}] ✅ WebSocket connected successfully!`);
      setIsConnected(true);
      onOpenRef.current?.();
    };

    ws.onmessage = (event) => {
      const msgTimestamp = new Date().toISOString();
      console.log(`[${msgTimestamp}] 📨 Raw WebSocket message received:`, event.data.substring(0, 200));
      
      try {
        const data = JSON.parse(event.data);
        console.log(`[${msgTimestamp}] ✅ Message parsed successfully`);
        onMessageRef.current?.(data);
      } catch (error) {
        console.error(`[${msgTimestamp}] ❌ WebSocket message parse error:`, error);
        console.error(`[${msgTimestamp}] 📋 Raw data:`, event.data);
      }
    };

    ws.onclose = (event) => {
      console.log(`[${new Date().toISOString()}] 🔌 WebSocket disconnected`);
      console.log(`[${new Date().toISOString()}] 📊 Close code: ${event.code}, reason: ${event.reason}`);
      setIsConnected(false);
      onCloseRef.current?.();
    };

    ws.onerror = (error) => {
      console.error(`[${new Date().toISOString()}] ❌ WebSocket error:`, error);
      onErrorRef.current?.(error);
    };

    return () => {
      if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
        console.log(`[${new Date().toISOString()}] 🔌 Closing WebSocket connection...`);
        ws.close();
      }
    };
  }, [token]);

  const sendMessage = useCallback((message: any) => {
    const timestamp = new Date().toISOString();
    
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      console.log(`[${timestamp}] 📤 CLIENT: Sending message type: ${message.type}`);
      wsRef.current.send(JSON.stringify(message));
      console.log(`[${timestamp}] ✅ Message sent successfully`);
    } else {
      console.warn(`[${timestamp}] ⚠️ WebSocket not connected. ReadyState: ${wsRef.current?.readyState}`);
      console.warn(`[${timestamp}] 📋 Attempted message:`, message);
    }
  }, []);

  return { isConnected, sendMessage };
};
