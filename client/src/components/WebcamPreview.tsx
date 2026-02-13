import { useEffect } from 'react';

interface WebcamPreviewProps {
  videoRef: React.RefObject<HTMLVideoElement>;
  isActive: boolean;
  className?: string;
}

export default function WebcamPreview({ videoRef, isActive, className = '' }: WebcamPreviewProps) {
  useEffect(() => {
    if (videoRef.current && isActive) {
      videoRef.current.play();
    }
  }, [videoRef, isActive]);

  return (
    <div className={`relative ${className}`}>
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="w-full h-full object-cover rounded-lg border border-neutral-200 bg-neutral-900"
      />
      {!isActive && (
        <div className="absolute inset-0 flex items-center justify-center bg-neutral-900 rounded-lg">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 bg-neutral-800 rounded-lg mb-3">
              <svg
                className="w-6 h-6 text-neutral-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                />
              </svg>
            </div>
            <p className="text-xs text-neutral-400">Camera off</p>
          </div>
        </div>
      )}
      {isActive && (
        <div className="absolute top-3 right-3">
          <span className="flex items-center gap-1.5 px-2 py-1 bg-red-500 text-white text-xs font-medium rounded-md shadow-sm">
            <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse"></span>
            LIVE
          </span>
        </div>
      )}
    </div>
  );
}
