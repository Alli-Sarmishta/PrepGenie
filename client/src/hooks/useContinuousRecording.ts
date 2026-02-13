import { useState, useRef, useCallback, useEffect } from 'react';

interface UseContinuousRecordingProps {
  onAudioData: (audioBlob: Blob) => void;
  silenceThreshold?: number;
  silenceDuration?: number;
  isAISpeaking?: boolean; // New prop to know when AI is speaking
}

export const useContinuousRecording = ({
  onAudioData,
  silenceThreshold = 0.015, // Threshold for detecting speech (RMS-based)
  silenceDuration = 1500,   // 1.5 seconds of silence before sending
  isAISpeaking = false
}: UseContinuousRecordingProps) => {
  // Dynamic threshold based on ambient noise
  const ambientNoiseRef = useRef<number>(0.01);
  const noiseCalibrationSamples = useRef<number[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const silenceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const isRecordingRef = useRef(false);
  const isSpeakingRef = useRef(false);
  const animationFrameRef = useRef<number | null>(null);
  const onAudioDataRef = useRef(onAudioData);
  const speechStartTimeRef = useRef<number | null>(null);
  const lastSpeechTimeRef = useRef<number | null>(null);
  const minSpeechDuration = 300;
  const debugIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isAISpeakingRef = useRef(isAISpeaking);
  const lastNonZeroAudioRef = useRef<number>(Date.now());
  const mediaStreamSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const lastReconnectAttemptRef = useRef<number>(0);

  // Update callback ref
  useEffect(() => {
    onAudioDataRef.current = onAudioData;
  }, [onAudioData]);

  // Update AI speaking ref
  useEffect(() => {
    isAISpeakingRef.current = isAISpeaking;
    // When AI starts speaking, discard any accumulated audio and reset state
    if (isAISpeaking) {
      if (isSpeakingRef.current) {
        console.log(`[${new Date().toISOString()}] 🤖 AI started speaking - discarding user audio`);
      }
      audioChunksRef.current = [];
      isSpeakingRef.current = false;
      speechStartTimeRef.current = null;
      lastSpeechTimeRef.current = null;
      setIsSpeaking(false);
    } else {
      // AI stopped speaking - recalibrate and wake recording context so mic is captured again
      console.log(`[${new Date().toISOString()}] 🔧 AI stopped speaking - recalibrating noise...`);
      noiseCalibrationSamples.current = [];
      lastNonZeroAudioRef.current = Date.now();
      const ctx = audioContextRef.current;
      if (ctx && ctx.state !== 'closed') {
        if (ctx.state === 'suspended') {
          console.log(`[${new Date().toISOString()}] ▶️ Resuming recording AudioContext after AI stopped`);
          ctx.resume();
        }
        // Reconnect mic to analyser in case the graph stopped delivering data after playback
        const stream = streamRef.current;
        const analyser = analyserRef.current;
        if (stream && analyser && mediaStreamSourceRef.current) {
          try {
            mediaStreamSourceRef.current.disconnect();
          } catch (_) { /* already disconnected */ }
          const newSource = ctx.createMediaStreamSource(stream);
          newSource.connect(analyser);
          mediaStreamSourceRef.current = newSource;
          console.log(`[${new Date().toISOString()}] 🔌 Reconnected microphone to analyser after AI stopped`);
        }
      }
    }
  }, [isAISpeaking]);

  const sendAudioChunk = useCallback(() => {
    const timestamp = new Date().toISOString();
    
    // Don't send if AI is speaking (would be speaker feedback)
    if (isAISpeakingRef.current) {
      console.log(`[${timestamp}] ⏭️ AI is speaking, discarding audio`);
      audioChunksRef.current = [];
      speechStartTimeRef.current = null;
      return;
    }
    
    if (audioChunksRef.current.length === 0) {
      console.log(`[${timestamp}] 📭 No audio chunks to send`);
      return;
    }

    // Check if speech was long enough (avoid sending noise)
    const speechDuration = speechStartTimeRef.current 
      ? Date.now() - speechStartTimeRef.current 
      : 0;
    
    const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
    console.log(`[${timestamp}] 📦 Created audio blob: ${audioBlob.size} bytes, speech duration: ${speechDuration}ms`);
    
    // More lenient checks - send if we have reasonable audio
    if (speechDuration < minSpeechDuration && audioBlob.size < 10000) {
      console.log(`[${timestamp}] ⏭️ Speech too short (${speechDuration}ms) and small (${audioBlob.size} bytes), likely noise`);
      audioChunksRef.current = [];
      speechStartTimeRef.current = null;
      return;
    }

    // Send if blob has content (more lenient - 2KB minimum)
    if (audioBlob.size > 2000 && audioBlob.size < 10000000) {
      console.log(`[${timestamp}] 📤 Sending audio chunk...`);
      onAudioDataRef.current(audioBlob);
    } else if (audioBlob.size <= 2000) {
      console.log(`[${timestamp}] ⏭️ Audio too small (${audioBlob.size} bytes), skipping`);
    } else {
      console.log(`[${timestamp}] ⏭️ Audio too large (${audioBlob.size} bytes), skipping`);
    }

    // Reset chunks and speech timer (but DON'T stop recording)
    audioChunksRef.current = [];
    speechStartTimeRef.current = null;
  }, []);

  const monitorAudioLevel = useCallback(() => {
    if (!analyserRef.current || !isRecordingRef.current) return;

    const analyser = analyserRef.current;
    const dataArray = new Uint8Array(analyser.frequencyBinCount);

    const checkAudioLevel = () => {
      if (!isRecordingRef.current) {
        console.log(`[${new Date().toISOString()}] 🛑 Monitoring stopped - not recording`);
        return;
      }

      // Skip processing while AI is speaking to avoid capturing speaker output
      if (isAISpeakingRef.current) {
        // Don't accumulate audio while AI speaks, clear any chunks
        if (audioChunksRef.current.length > 0) {
          audioChunksRef.current = [];
        }
        if (isSpeakingRef.current) {
          isSpeakingRef.current = false;
          speechStartTimeRef.current = null;
          setIsSpeaking(false);
        }
        animationFrameRef.current = requestAnimationFrame(checkAudioLevel);
        return;
      }

      // Use time domain data for more reliable voice detection
      const timeDomainData = new Uint8Array(analyser.fftSize);
      analyser.getByteTimeDomainData(timeDomainData);
      
      // Calculate RMS (root mean square) for better voice detection
      let sumSquares = 0;
      for (let i = 0; i < timeDomainData.length; i++) {
        const normalized = (timeDomainData[i] - 128) / 128;
        sumSquares += normalized * normalized;
      }
      const rms = Math.sqrt(sumSquares / timeDomainData.length);
      
      // Also get frequency data for additional check
      analyser.getByteFrequencyData(dataArray);
      const sum = dataArray.reduce((a, b) => a + b, 0);
      const average = sum / dataArray.length / 255;
      const maxValue = Math.max(...dataArray) / 255;

      const now = Date.now();
      
      // Track when we last had non-zero input (detect dead analyser / suspended context)
      const zeroFor = now - lastNonZeroAudioRef.current;
      if (rms > 0.001 || maxValue > 0.05) {
        lastNonZeroAudioRef.current = now;
      } else if (zeroFor > 2000 && now - lastReconnectAttemptRef.current > 5000) {
        // Sustained zeros for 2+ s and not AI speaking - try to recover mic input
        const ctx = audioContextRef.current;
        const stream = streamRef.current;
        const anal = analyserRef.current;
        if (ctx && stream && anal && ctx.state !== 'closed') {
          lastReconnectAttemptRef.current = now;
          if (ctx.state === 'suspended') {
            console.log(`[${new Date().toISOString()}] ⚠️ Sustained zeros, context suspended - resuming...`);
            ctx.resume();
          }
          try {
            if (mediaStreamSourceRef.current) {
              mediaStreamSourceRef.current.disconnect();
            }
            const newSource = ctx.createMediaStreamSource(stream);
            newSource.connect(anal);
            mediaStreamSourceRef.current = newSource;
            console.log(`[${new Date().toISOString()}] 🔌 Reconnected microphone (sustained zeros for ${Math.round(zeroFor / 1000)}s)`);
          } catch (e) {
            console.warn(`[${new Date().toISOString()}] Reconnect failed:`, e);
          }
        }
      }
      
      // Calibrate ambient noise level (first 2 seconds when not speaking)
      if (!isSpeakingRef.current && noiseCalibrationSamples.current.length < 40) {
        noiseCalibrationSamples.current.push(rms);
        if (noiseCalibrationSamples.current.length === 40) {
          // Calculate average ambient noise + margin
          const avgNoise = noiseCalibrationSamples.current.reduce((a, b) => a + b, 0) / 40;
          ambientNoiseRef.current = avgNoise;
          console.log(`[${new Date().toISOString()}] 🔧 Ambient noise calibrated: ${avgNoise.toFixed(4)}`);
        }
      }
      
      // Dynamic threshold: significantly above ambient noise
      const effectiveThreshold = Math.max(ambientNoiseRef.current * 2.5, 0.015);
      
      // Speech detection: RMS must be significantly above ambient noise AND have clear peaks
      const isSpeechDetected = rms > effectiveThreshold && maxValue > 0.3;
      
      if (isSpeechDetected) {
        // User is speaking
        lastSpeechTimeRef.current = now;
        
        if (!isSpeakingRef.current) {
          console.log(`[${new Date().toISOString()}] 🎙️ Speech STARTED (rms: ${rms.toFixed(4)}, threshold: ${effectiveThreshold.toFixed(4)}, max: ${maxValue.toFixed(4)})`);
          isSpeakingRef.current = true;
          speechStartTimeRef.current = now;
          setIsSpeaking(true);
        }
        
        // Clear silence timeout when speaking
        if (silenceTimeoutRef.current) {
          clearTimeout(silenceTimeoutRef.current);
          silenceTimeoutRef.current = null;
        }
      } else if (isSpeakingRef.current) {
        // Not detecting speech anymore - check if we've been silent long enough
        const silentFor = lastSpeechTimeRef.current ? now - lastSpeechTimeRef.current : 0;
        
        if (silentFor >= silenceDuration) {
          const speechDuration = speechStartTimeRef.current 
            ? now - speechStartTimeRef.current 
            : 0;
          console.log(`[${new Date().toISOString()}] 🔇 Silence detected for ${silentFor}ms after ${speechDuration}ms of speech`);
          
          isSpeakingRef.current = false;
          setIsSpeaking(false);
          sendAudioChunk();
        }
      }

      animationFrameRef.current = requestAnimationFrame(checkAudioLevel);
    };

    checkAudioLevel();
  }, [silenceThreshold, silenceDuration, sendAudioChunk]);

  const startRecording = useCallback(async () => {
    const timestamp = new Date().toISOString();
    
    try {
      console.log(`[${timestamp}] 🎤 Starting recording...`);
      
      // Request microphone with specific constraints
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
      
      // Log audio track settings
      const audioTrack = stream.getAudioTracks()[0];
      console.log(`[${timestamp}] ✅ Got media stream`);
      console.log(`[${timestamp}] 📊 Audio track settings:`, audioTrack.getSettings());

      // Setup audio analysis for silence detection
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      // Resume audio context if suspended (Chrome autoplay policy)
      if (audioContext.state === 'suspended') {
        await audioContext.resume();
        console.log(`[${timestamp}] ✅ AudioContext resumed`);
      }
      
      const analyser = audioContext.createAnalyser();
      const microphone = audioContext.createMediaStreamSource(stream);
      
      analyser.smoothingTimeConstant = 0.5; // Less smoothing for faster response
      analyser.fftSize = 256; // Smaller FFT for faster processing
      analyser.minDecibels = -90;
      analyser.maxDecibels = -10;
      microphone.connect(analyser);

      // Keep context running: connect analyser to destination with gain 0 so the
      // context is not suspended by the browser (no-destination contexts often suspend)
      const keepAliveGain = audioContext.createGain();
      keepAliveGain.gain.value = 0;
      analyser.connect(keepAliveGain);
      keepAliveGain.connect(audioContext.destination);

      audioContextRef.current = audioContext;
      analyserRef.current = analyser;
      mediaStreamSourceRef.current = microphone;
      console.log(`[${timestamp}] ✅ Audio analyser setup complete (sampleRate: ${audioContext.sampleRate})`);

      // Setup MediaRecorder with fallback mime types
      let mimeType = 'audio/webm;codecs=opus';
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = 'audio/webm';
        if (!MediaRecorder.isTypeSupported(mimeType)) {
          mimeType = 'audio/mp4';
        }
      }
      console.log(`[${timestamp}] 📊 Using mime type: ${mimeType}`);

      const mediaRecorder = new MediaRecorder(stream, { mimeType });

      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onerror = (event) => {
        console.error(`[${new Date().toISOString()}] ❌ MediaRecorder error:`, event);
      };

      mediaRecorder.start(100); // Collect data every 100ms
      isRecordingRef.current = true;
      setIsRecording(true);
      console.log(`[${timestamp}] ✅ MediaRecorder started (state: ${mediaRecorder.state})`);

      // Start monitoring audio levels
      monitorAudioLevel();
      console.log(`[${timestamp}] ✅ Audio monitoring started`);

      // Debug: Log audio levels periodically
      debugIntervalRef.current = setInterval(() => {
        if (analyserRef.current && isRecordingRef.current) {
          const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
          const timeDomainData = new Uint8Array(analyserRef.current.fftSize);
          
          analyserRef.current.getByteFrequencyData(dataArray);
          analyserRef.current.getByteTimeDomainData(timeDomainData);
          
          // Calculate RMS
          let sumSquares = 0;
          for (let i = 0; i < timeDomainData.length; i++) {
            const normalized = (timeDomainData[i] - 128) / 128;
            sumSquares += normalized * normalized;
          }
          const rms = Math.sqrt(sumSquares / timeDomainData.length);
          const max = Math.max(...dataArray) / 255;
          const ctxState = audioContextRef.current?.state ?? 'unknown';
          const threshold = Math.max(ambientNoiseRef.current * 2.5, 0.015);
          console.log(`[${new Date().toISOString()}] 🔊 Audio - rms: ${rms.toFixed(4)}, thresh: ${threshold.toFixed(4)}, max: ${max.toFixed(4)}, speaking: ${isSpeakingRef.current}, aiSpeaking: ${isAISpeakingRef.current}, ctx: ${ctxState}`);
          
          // If audio context is suspended, resume it so we get mic data again
          if (audioContextRef.current?.state === 'suspended') {
            console.log(`[${new Date().toISOString()}] ⚠️ AudioContext suspended, resuming...`);
            audioContextRef.current.resume();
          }
        }
      }, 3000);

    } catch (error) {
      console.error(`[${timestamp}] ❌ Failed to start recording:`, error);
      throw error;
    }
  }, [monitorAudioLevel]);

  const stopRecording = useCallback(() => {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] 🛑 Stopping recording...`);

    isRecordingRef.current = false;

    if (debugIntervalRef.current) {
      clearInterval(debugIntervalRef.current);
      debugIntervalRef.current = null;
    }

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }

    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close();
    }
    mediaStreamSourceRef.current = null;

    if (silenceTimeoutRef.current) {
      clearTimeout(silenceTimeoutRef.current);
      silenceTimeoutRef.current = null;
    }

    setIsRecording(false);
    setIsSpeaking(false);
    console.log(`[${timestamp}] ✅ Recording stopped`);
  }, []);

  return {
    isRecording,
    isSpeaking,
    startRecording,
    stopRecording
  };
};
