import { useState, useRef, useCallback, useEffect } from 'react';

export const useWebcam = () => {
  const [isActive, setIsActive] = useState(false);
  const [hasPermission, setHasPermission] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Request webcam permission and start stream
  const startWebcam = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      });

      streamRef.current = stream;
      setHasPermission(true);
      setIsActive(true);

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }

      return stream;
    } catch (error) {
      console.error('Webcam permission denied:', error);
      setHasPermission(false);
      throw error;
    }
  }, []);

  // Stop webcam stream
  const stopWebcam = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    
    setIsActive(false);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopWebcam();
    };
  }, [stopWebcam]);

  return {
    isActive,
    hasPermission,
    videoRef,
    startWebcam,
    stopWebcam,
  };
};
