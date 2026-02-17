import { useState, useRef, useCallback } from 'react';

interface UsePushToTalkRecordingProps {
  onAudioReady: (audioBlob: Blob) => void;
}

export const usePushToTalkRecording = ({
  onAudioReady
}: UsePushToTalkRecordingProps) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const recordingStartTimeRef = useRef<number | null>(null);

  // Initialize the microphone (call once on component mount)
  const initialize = useCallback(async () => {
    const timestamp = new Date().toISOString();
    
    try {
      console.log(`[${timestamp}] 🎤 Initializing microphone...`);
      
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 48000,
          channelCount: 1
        } 
      });
      
      streamRef.current = stream;
      console.log(`[${timestamp}] ✅ Microphone initialized`);
      setIsInitialized(true);
      
      return true;
    } catch (error) {
      console.error(`[${timestamp}] ❌ Failed to initialize microphone:`, error);
      throw error;
    }
  }, []);

  // Start recording (call when user presses button/spacebar)
  const startRecording = useCallback(async () => {
    const timestamp = new Date().toISOString();
    
    if (!streamRef.current) {
      console.error(`[${timestamp}] ❌ Cannot start recording - microphone not initialized`);
      return;
    }

    if (isRecording) {
      console.log(`[${timestamp}] ⚠️ Already recording`);
      return;
    }

    try {
      // Check if the stream is still active
      const isStreamActive = streamRef.current.active && 
        streamRef.current.getTracks().some(track => track.readyState === 'live');
      
      if (!isStreamActive) {
        console.warn(`[${timestamp}] ⚠️ Microphone stream inactive, reinitializing...`);
        
        // Stop old tracks
        streamRef.current.getTracks().forEach(track => track.stop());
        
        // Reinitialize the microphone
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ 
            audio: {
              echoCancellation: true,
              noiseSuppression: true,
              autoGainControl: true,
              sampleRate: 48000,
              channelCount: 1
            } 
          });
          
          streamRef.current = stream;
          console.log(`[${timestamp}] ✅ Microphone reinitialized`);
        } catch (reinitError) {
          console.error(`[${timestamp}] ❌ Failed to reinitialize microphone:`, reinitError);
          setIsInitialized(false);
          throw reinitError;
        }
      }
      
      console.log(`[${timestamp}] 🎙️ Starting recording...`);
      
      // Setup MediaRecorder
      let mimeType = 'audio/webm;codecs=opus';
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = 'audio/webm';
        if (!MediaRecorder.isTypeSupported(mimeType)) {
          mimeType = 'audio/mp4';
        }
      }
      console.log(`[${timestamp}] 📊 Using mime type: ${mimeType}`);

      const mediaRecorder = new MediaRecorder(streamRef.current, { mimeType });
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      recordingStartTimeRef.current = Date.now();

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
          console.log(`[${new Date().toISOString()}] 📦 Audio chunk: ${event.data.size} bytes (total: ${audioChunksRef.current.length} chunks)`);
        }
      };

      mediaRecorder.onerror = (event) => {
        console.error(`[${new Date().toISOString()}] ❌ MediaRecorder error:`, event);
      };

      mediaRecorder.start(100); // Collect data every 100ms
      setIsRecording(true);
      console.log(`[${timestamp}] ✅ Recording started`);
    } catch (error) {
      console.error(`[${timestamp}] ❌ Failed to start recording:`, error);
    }
  }, [isRecording]);

  // Stop recording (call when user releases button/spacebar)
  const stopRecording = useCallback(() => {
    const timestamp = new Date().toISOString();
    
    if (!isRecording || !mediaRecorderRef.current) {
      console.log(`[${timestamp}] ⚠️ Not recording`);
      return;
    }

    try {
      const recorder = mediaRecorderRef.current;
      const duration = recordingStartTimeRef.current 
        ? Date.now() - recordingStartTimeRef.current 
        : 0;

      console.log(`[${timestamp}] 🛑 Stopping recording (duration: ${duration}ms)...`);

      // Stop the recorder
      recorder.stop();

      // Wait for final data and create blob
      recorder.onstop = () => {
        const stopTimestamp = new Date().toISOString();
        
        if (audioChunksRef.current.length === 0) {
          console.log(`[${stopTimestamp}] ⚠️ No audio chunks recorded`);
          setIsRecording(false);
          return;
        }

        const audioBlob = new Blob(audioChunksRef.current, { type: recorder.mimeType });
        console.log(`[${stopTimestamp}] 📦 Created audio blob: ${audioBlob.size} bytes from ${audioChunksRef.current.length} chunks`);
        
        // Only send if we have substantial audio (> 2KB and > 500ms)
        if (audioBlob.size > 2000 && duration > 500) {
          console.log(`[${stopTimestamp}] ✅ Audio ready - sending to handler`);
          onAudioReady(audioBlob);
        } else {
          console.log(`[${stopTimestamp}] ⏭️ Audio too short (${audioBlob.size} bytes, ${duration}ms) - skipping`);
        }

        // Reset
        audioChunksRef.current = [];
        recordingStartTimeRef.current = null;
        setIsRecording(false);
      };
    } catch (error) {
      console.error(`[${timestamp}] ❌ Failed to stop recording:`, error);
      setIsRecording(false);
    }
  }, [isRecording, onAudioReady]);

  // Cleanup (call on component unmount)
  const cleanup = useCallback(() => {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] 🧹 Cleaning up microphone...`);

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }

    setIsRecording(false);
    setIsInitialized(false);
    console.log(`[${timestamp}] ✅ Cleanup complete`);
  }, []);

  return {
    isRecording,
    isInitialized,
    initialize,
    startRecording,
    stopRecording,
    cleanup
  };
};
