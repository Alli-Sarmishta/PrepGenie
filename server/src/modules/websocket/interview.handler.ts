import { WebSocket } from 'ws';
import jwt from 'jsonwebtoken';
import { processAudioChunk } from '../ai/audio.service.js';
import { config } from '../../config/env.js';
import { handleSetupResponse } from './setup.handler.js';
import { handleInterviewResponse, handleInterviewTermination } from './interview-response.handler.js';

const JWT_SECRET = config.jwt.secret;

interface AuthPayload {
  userId: string;
  email: string;
}

interface InterviewSession {
  interviewId: string;
  userId: string;
  currentQuestionIndex: number;
  questions: string[];
  answers: string[];
  isSetupPhase: boolean;
  setupPhase: 'role' | 'type' | 'techStack' | 'experience' | 'questions' | 'complete';
  setupData: {
    interviewType?: string;
    jobRole?: string;
    techStack?: string[];
    experienceLevel?: string;
    numberOfQuestions?: number;
  };
  lastQuestion?: string;
  lastSetupQuestion?: string; // Store the last setup question for context
}

// Store active sessions (in production, use Redis)
// Key: sessionId (unique per setup)
const sessions = new Map<string, InterviewSession>();
// Key: userId -> sessionId mapping (to find sessions by user)
const userSessionMap = new Map<string, string>();

export const handleInterviewConnection = (ws: WebSocket, token: string) => {
  let userId: string;
  const timestamp = new Date().toISOString();

  console.log(`\n[${timestamp}] 🔐 Verifying JWT token...`);

  try {
    // Verify JWT token
    const decoded = jwt.verify(token, JWT_SECRET) as AuthPayload;
    userId = decoded.userId;
    console.log(`[${timestamp}] ✅ Token verified for userId: ${userId}`);
  } catch (error) {
    console.error(`[${timestamp}] ❌ Token verification failed:`, error);
    ws.close(1008, 'Invalid token');
    return;
  }

  ws.on('message', async (data) => {
    const msgTimestamp = new Date().toISOString();
    try {
      const message = JSON.parse(data.toString());
      console.log(`\n[${msgTimestamp}] 📥 Received message type: ${message.type} from userId: ${userId}`);
      console.log(`[${msgTimestamp}] 📋 Full message:`, JSON.stringify(message, null, 2));
      
      switch (message.type) {
        case 'START_SETUP':
          console.log(`[${msgTimestamp}] 🎬 Starting setup phase...`);
          await handleStartSetup(ws, userId);
          break;

        case 'AUDIO_CHUNK':
          console.log(`[${msgTimestamp}] 🎤 Processing audio chunk (size: ${message.audioData?.length || 0} bytes)`);
          await handleAudioChunk(ws, userId, message.audioData, message.sessionId);
          break;

        case 'END_INTERVIEW':
          console.log(`[${msgTimestamp}] 🛑 Ending interview...`);
          await handleEndInterview(ws, userId);
          break;

        default:
          console.log(`[${msgTimestamp}] ⚠️ Unknown message type: ${message.type}`);
      }
    } catch (error) {
      console.error(`[${msgTimestamp}] ❌ WebSocket message error:`, error);
      ws.send(JSON.stringify({
        type: 'ERROR',
        message: 'Failed to process message'
      }));
    }
  });
};

// Start setup phase (voice-based configuration)
const handleStartSetup = async (ws: WebSocket, userId: string) => {
  const timestamp = new Date().toISOString();
  console.log(`\n[${timestamp}] 🎬 STARTING SETUP PHASE for userId: ${userId}`);
  
  const { textToSpeech } = await import('../ai/audio.service.js');
  
  // Check if user already has an active session (for duplicate connections)
  const existingSessionId = userSessionMap.get(userId);
  if (existingSessionId && sessions.has(existingSessionId)) {
    console.log(`[${timestamp}] ⚠️ User already has active session: ${existingSessionId}`);
    console.log(`[${timestamp}] 🔄 Reusing existing session`);
    
    // Send the current state back
    const existingSession = sessions.get(existingSessionId)!;
    ws.send(JSON.stringify({
      type: 'AI_SPEAKING',
      text: 'Welcome back! Let\'s continue where we left off.',
      sessionId: existingSessionId
    }));
    return;
  }
  
  // Initialize setup session
  const sessionId = `setup_${userId}_${Date.now()}`;
  console.log(`[${timestamp}] 📝 Created session: ${sessionId}`);
  
  const session: InterviewSession = {
    interviewId: '',
    userId,
    currentQuestionIndex: 0,
    questions: [],
    answers: [],
    isSetupPhase: true,
    setupPhase: 'role',
    setupData: {},
    lastSetupQuestion: "What job role are you interviewing for?"
  };
  
  sessions.set(sessionId, session);
  userSessionMap.set(userId, sessionId);
  
  console.log(`[${timestamp}] 💾 Session stored. Total sessions: ${sessions.size}`);

  // Welcome message
  const welcomeText = "Hello! I'm your AI interviewer. I'll ask you a few questions to set up your interview. Let's begin. What job role are you interviewing for? For example, Frontend Developer, Data Analyst, or Product Manager.";
  
  console.log(`[${timestamp}] 💬 Welcome message: "${welcomeText.substring(0, 50)}..."`);
  
  try {
    console.log(`[${timestamp}] 🎙️ Generating TTS audio...`);
    // Generate TTS audio
    const audioBuffer = await textToSpeech(welcomeText);
    const audioBase64 = audioBuffer.toString('base64');
    console.log(`[${timestamp}] ✅ TTS audio generated (${audioBase64.length} chars base64)`);

    const response = {
      type: 'AI_SPEAKING',
      text: welcomeText,
      audio: audioBase64,
      sessionId
    };
    
    console.log(`[${timestamp}] 📤 Sending AI_SPEAKING message to client`);
    ws.send(JSON.stringify(response));
    console.log(`[${timestamp}] ✅ Message sent successfully`);
  } catch (error) {
    console.error(`[${timestamp}] ❌ TTS error:`, error);
    console.log(`[${timestamp}] 📤 Sending text-only message as fallback`);
    ws.send(JSON.stringify({
      type: 'AI_SPEAKING',
      text: welcomeText,
      sessionId
    }));
  }
};

// Handle audio chunks (user speaking)
const handleAudioChunk = async (ws: WebSocket, userId: string, audioData: string, sessionId?: string) => {
  const timestamp = new Date().toISOString();
  
  try {
    console.log(`\n[${timestamp}] 🎤 Processing audio chunk for userId: ${userId}`);
    
    // Check if audio data is significant (not silence)
    if (!audioData || audioData.length < 100) {
      console.log(`[${timestamp}] ⏭️ Skipping audio chunk (too small: ${audioData?.length || 0} bytes)`);
      return; // Skip processing silence
    }

    console.log(`[${timestamp}] 📊 Audio chunk size: ${audioData.length} bytes`);
    console.log(`[${timestamp}] 🔄 Converting audio to text using Whisper...`);
    
    // Convert audio to text using Whisper
    const transcript = await processAudioChunk(audioData);
    console.log(`[${timestamp}] ✅ Whisper transcription: "${transcript}"`);

    // Skip empty transcripts
    if (!transcript || transcript.trim().length === 0) {
      console.log(`[${timestamp}] ⏭️ Skipping empty transcript`);
      return;
    }

    console.log(`[${timestamp}] 📤 Sending transcript to client`);
    // Send transcript back to client
    ws.send(JSON.stringify({
      type: 'TRANSCRIPT',
      text: transcript
    }));

    // Find session - first try by sessionId from client, then by userId
    console.log(`[${timestamp}] 🔍 Looking for session. SessionId from client: ${sessionId}`);
    console.log(`[${timestamp}] 🔍 Total sessions: ${sessions.size}`);
    console.log(`[${timestamp}] 🔍 Session keys:`, Array.from(sessions.keys()));
    console.log(`[${timestamp}] 🔍 UserSessionMap:`, Array.from(userSessionMap.entries()));
    
    let session: InterviewSession | undefined;
    
    // Try to find by sessionId first
    if (sessionId && sessions.has(sessionId)) {
      session = sessions.get(sessionId);
      console.log(`[${timestamp}] ✅ Found session by sessionId`);
    } else {
      // Fall back to userSessionMap
      const mappedSessionId = userSessionMap.get(userId);
      if (mappedSessionId && sessions.has(mappedSessionId)) {
        session = sessions.get(mappedSessionId);
        console.log(`[${timestamp}] ✅ Found session via userSessionMap`);
      } else {
        // Last resort: search by userId
        session = Array.from(sessions.values()).find(s => s.userId === userId);
        if (session) {
          console.log(`[${timestamp}] ✅ Found session by userId search`);
        }
      }
    }
    
    if (!session) {
      console.error(`[${timestamp}] ❌ No active session found for userId: ${userId}`);
      ws.send(JSON.stringify({
        type: 'ERROR',
        message: 'No active session found. Please refresh and start a new interview.'
      }));
      return;
    }

    console.log(`[${timestamp}] ✅ Session found. Phase: ${session.isSetupPhase ? 'SETUP' : 'INTERVIEW'}`);
    console.log(`[${timestamp}] 📋 Setup phase: ${session.setupPhase}`);

    // Process based on current phase
    if (session.isSetupPhase) {
      console.log(`[${timestamp}] 🎯 Routing to setup handler`);
      await handleSetupResponse(ws, session, transcript);
    } else {
      console.log(`[${timestamp}] 🎯 Routing to interview handler`);
      await handleInterviewResponse(ws, session, transcript);
    }
    
  } catch (error: unknown) {
    const err = error as Error;
    console.error(`[${timestamp}] ❌ Audio processing error:`, err?.message ?? error);
    console.error(`[${timestamp}] ❌ Stack:`, err?.stack);
    ws.send(JSON.stringify({
      type: 'ERROR',
      message: err?.message ?? 'Failed to process audio'
    }));
  }
};

// End interview and generate feedback
const handleEndInterview = async (ws: WebSocket, userId: string) => {
  const timestamp = new Date().toISOString();
  
  try {
    console.log(`\n[${timestamp}] 🛑 ENDING INTERVIEW for userId: ${userId}`);
    console.log(`[${timestamp}] 🔍 Total sessions: ${sessions.size}`);
    console.log(`[${timestamp}] 🔍 Session keys:`, Array.from(sessions.keys()));
    console.log(`[${timestamp}] 🔍 UserSessionMap:`, Array.from(userSessionMap.entries()));
    
    // Find session using userSessionMap first
    let session: InterviewSession | undefined;
    let sessionKey: string | undefined;
    
    const mappedSessionId = userSessionMap.get(userId);
    if (mappedSessionId && sessions.has(mappedSessionId)) {
      session = sessions.get(mappedSessionId);
      sessionKey = mappedSessionId;
      console.log(`[${timestamp}] ✅ Found session via userSessionMap: ${sessionKey}`);
    } else {
      // Fall back to search
      const entry = Array.from(sessions.entries()).find(([_, s]) => s.userId === userId);
      if (entry) {
        sessionKey = entry[0];
        session = entry[1];
        console.log(`[${timestamp}] ✅ Found session by search: ${sessionKey}`);
      }
    }
    
    if (!session) {
      console.error(`[${timestamp}] ❌ No active session found for userId: ${userId}`);
      console.log(`[${timestamp}] 📋 Available userIds in sessions:`, 
        Array.from(sessions.values()).map(s => s.userId)
      );
      ws.send(JSON.stringify({
        type: 'ERROR',
        message: 'No active session found. Please start a new interview.'
      }));
      return;
    }

    console.log(`[${timestamp}] ✅ Session found. InterviewId: ${session.interviewId}`);
    console.log(`[${timestamp}] 📊 Questions answered: ${session.answers.length}/${session.questions.length}`);

    await handleInterviewTermination(ws, session);
    
    // Clean up session
    if (sessionKey) {
      sessions.delete(sessionKey);
      userSessionMap.delete(userId);
      console.log(`[${timestamp}] 🗑️ Session cleaned up. Remaining sessions: ${sessions.size}`);
    }

  } catch (error) {
    console.error(`[${timestamp}] ❌ End interview error:`, error);
    ws.send(JSON.stringify({
      type: 'ERROR',
      message: 'Failed to end interview'
    }));
  }
};
