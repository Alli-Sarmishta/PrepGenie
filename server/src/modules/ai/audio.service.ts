import OpenAI from 'openai';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { config } from '../../config/env.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const openai = new OpenAI({
  apiKey: config.openai.apiKey
});

// Common noise patterns that Whisper might transcribe from silence/background noise
const NOISE_PATTERNS = [
  /^[\d\s\.]+$/,                    // Just numbers and dots (like "3. 3. 3.")
  /^[\s\.\,\-]+$/,                  // Just punctuation
  /マッシュ/,                         // Japanese characters from noise
  /Musical Point/i,                 // Common misheard pattern
  /^(um|uh|hmm|ah|oh)+$/i,          // Just filler words
  /^.{0,3}$/,                       // Very short transcripts (likely noise)
  /^(\d+\.?\s*)+$/,                 // Repeated numbers
  /^[^a-zA-Z]*$/,                   // No letters at all
];

// Check if transcript is likely noise
const isLikelyNoise = (transcript: string): boolean => {
  const trimmed = transcript.trim();
  
  // Empty or very short
  if (trimmed.length < 4) return true;
  
  // Check against noise patterns
  for (const pattern of NOISE_PATTERNS) {
    if (pattern.test(trimmed)) {
      return true;
    }
  }
  
  // Check if mostly non-alphabetic
  const alphabeticCount = (trimmed.match(/[a-zA-Z]/g) || []).length;
  const ratio = alphabeticCount / trimmed.length;
  if (ratio < 0.3) return true; // Less than 30% letters
  
  return false;
};

// Convert audio to text using Whisper
export const processAudioChunk = async (audioData: string): Promise<string> => {
  const timestamp = new Date().toISOString();
  
  try {
    // audioData is base64 encoded audio (webm from browser MediaRecorder)
    const buffer = Buffer.from(audioData, 'base64');
    
    // Check if buffer is too small (likely silence)
    if (buffer.length < 5000) {
      console.log(`[${timestamp}] ⏭️ Audio buffer too small (${buffer.length} bytes), skipping`);
      return '';
    }

    console.log(`[${timestamp}] 📎 Buffer size: ${buffer.length} bytes`);
    console.log(`[${timestamp}] 📎 First 20 bytes (hex): ${buffer.slice(0, 20).toString('hex')}`);

    // Whisper API needs a file on disk or fs.ReadStream (documented approach)
    const uploadsDir = path.join(__dirname, '../../../uploads');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    // Try different extensions - Whisper is picky about webm format
    // The browser sends opus codec in webm container, try .ogg which is more compatible
    const tempPath = path.join(uploadsDir, `audio_${Date.now()}.ogg`);
    fs.writeFileSync(tempPath, buffer);
    console.log(`[${timestamp}] 💾 Wrote temp file as .ogg: ${tempPath}`);

    // Verify file was written
    const fileSize = fs.statSync(tempPath).size;
    console.log(`[${timestamp}] ✅ File verified: ${fileSize} bytes`);

    const transcription = await openai.audio.transcriptions.create({
      file: fs.createReadStream(tempPath),
      model: 'whisper-1',
      language: 'en',
      prompt: 'This is a job interview conversation.'
    });

    // Cleanup temp file
    try {
      fs.unlinkSync(tempPath);
      console.log(`[${timestamp}] 🗑️ Cleaned up temp file`);
    } catch (e) {
      console.warn(`[${timestamp}] ⚠️ Failed to cleanup temp file:`, e);
    }

    const text = transcription.text ?? '';
    
    if (isLikelyNoise(text)) {
      console.log(`[${timestamp}] 🔇 Transcript appears to be noise: "${text}"`);
      return '';
    }

    console.log(`[${timestamp}] ✅ Transcription successful: "${text.substring(0, 50)}..."`);
    return text;
  } catch (error: unknown) {
    const err = error as Error & { status?: number; code?: string };
    console.error(`[${timestamp}] ❌ Whisper error:`, err?.message ?? String(error));
    console.error(`[${timestamp}] ❌ Full error:`, error);
    throw new Error(err?.message ?? 'Failed to transcribe audio');
  }
};

// Convert text to speech
export const textToSpeech = async (text: string): Promise<Buffer> => {
  const timestamp = new Date().toISOString();
  
  try {
    console.log(`[${timestamp}] 🎙️ TTS Request - Text length: ${text.length} chars`);
    console.log(`[${timestamp}] 📝 TTS Text preview: "${text.substring(0, 100)}..."`);
    
    const response = await openai.audio.speech.create({
      model: 'tts-1',
      voice: 'alloy', // Options: alloy, echo, fable, onyx, nova, shimmer
      input: text
    });

    console.log(`[${timestamp}] ✅ TTS Response received`);
    
    const buffer = Buffer.from(await response.arrayBuffer());
    console.log(`[${timestamp}] ✅ TTS Buffer created - Size: ${buffer.length} bytes`);
    
    return buffer;
  } catch (error) {
    console.error(`[${timestamp}] ❌ TTS error:`, error);
    throw new Error('Failed to generate speech');
  }
};
