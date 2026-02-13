import { useCallback, useRef } from 'react';

export const useAudioPlayer = () => {
  const audioContextRef = useRef<AudioContext | null>(null);
  const currentSourceRef = useRef<AudioBufferSourceNode | null>(null);

  const playAudio = useCallback(async (base64Audio: string) => {
    const timestamp = new Date().toISOString();
    
    try {
      console.log(`[${timestamp}] 🔊 AUDIO PLAYER: Starting playback`);
      console.log(`[${timestamp}] 📊 Base64 audio length: ${base64Audio.length} chars`);
      
      // Stop any currently playing audio
      if (currentSourceRef.current) {
        console.log(`[${timestamp}] ⏹️ Stopping current audio`);
        currentSourceRef.current.stop();
      }

      // Create AudioContext if it doesn't exist
      if (!audioContextRef.current) {
        console.log(`[${timestamp}] 🎵 Creating new AudioContext`);
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }

      const audioContext = audioContextRef.current;
      console.log(`[${timestamp}] 📱 AudioContext state: ${audioContext.state}`);

      // Resume if suspended
      if (audioContext.state === 'suspended') {
        console.log(`[${timestamp}] ▶️ Resuming suspended AudioContext`);
        await audioContext.resume();
      }

      console.log(`[${timestamp}] 🔄 Converting base64 to ArrayBuffer...`);
      // Convert base64 to ArrayBuffer
      const binaryString = atob(base64Audio);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      console.log(`[${timestamp}] ✅ ArrayBuffer created: ${bytes.buffer.byteLength} bytes`);

      console.log(`[${timestamp}] 🎼 Decoding audio data...`);
      // Decode audio data
      const audioBuffer = await audioContext.decodeAudioData(bytes.buffer);
      console.log(`[${timestamp}] ✅ Audio decoded - Duration: ${audioBuffer.duration.toFixed(2)}s`);

      console.log(`[${timestamp}] 🎮 Creating audio source...`);
      // Create source and play
      const source = audioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioContext.destination);
      source.start(0);

      currentSourceRef.current = source;
      console.log(`[${timestamp}] ▶️ Audio playback started!`);

      return new Promise<void>((resolve) => {
        source.onended = () => {
          console.log(`[${new Date().toISOString()}] ✅ Audio playback ended`);
          resolve();
        };
      });
    } catch (error) {
      console.error(`[${timestamp}] ❌ Audio playback error:`, error);
      console.error(`[${timestamp}] ❌ Error details:`, JSON.stringify(error, null, 2));
      throw error;
    }
  }, []);

  const stopAudio = useCallback(() => {
    if (currentSourceRef.current) {
      currentSourceRef.current.stop();
      currentSourceRef.current = null;
    }
  }, []);

  return { playAudio, stopAudio };
};
