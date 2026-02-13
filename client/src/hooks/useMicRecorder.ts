import { useState, useRef, useCallback } from 'react';

export const useMicRecorder = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [hasPermission, setHasPermission] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // Request microphone permission
  const requestPermission = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setHasPermission(true);
      return stream;
    } catch (error) {
      console.error('Microphone permission denied:', error);
      setHasPermission(false);
      throw error;
    }
  }, []);

  // Start recording
  const startRecording = useCallback(
    async (onDataAvailable?: (audioBlob: Blob) => void) => {
      try {
        const stream = await requestPermission();
        
        const mediaRecorder = new MediaRecorder(stream, {
          mimeType: 'audio/webm',
        });
        
        mediaRecorderRef.current = mediaRecorder;
        audioChunksRef.current = [];

        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            audioChunksRef.current.push(event.data);
            onDataAvailable?.(event.data);
          }
        };

        mediaRecorder.start(1000); // Collect data every 1 second
        setIsRecording(true);
      } catch (error) {
        console.error('Failed to start recording:', error);
        throw error;
      }
    },
    [requestPermission]
  );

  // Stop recording
  const stopRecording = useCallback((): Promise<Blob> => {
    return new Promise((resolve) => {
      if (!mediaRecorderRef.current) {
        resolve(new Blob());
        return;
      }

      mediaRecorderRef.current.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, {
          type: 'audio/webm',
        });
        resolve(audioBlob);
        setIsRecording(false);
        
        // Stop all tracks
        if (mediaRecorderRef.current?.stream) {
          mediaRecorderRef.current.stream.getTracks().forEach((track) => track.stop());
        }
      };

      mediaRecorderRef.current.stop();
    });
  }, []);

  // Convert blob to base64
  const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = (reader.result as string).split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

  return {
    isRecording,
    hasPermission,
    startRecording,
    stopRecording,
    blobToBase64,
    requestPermission,
  };
};
