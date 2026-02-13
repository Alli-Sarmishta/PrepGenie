interface AudioControlsProps {
  isMicActive: boolean;
  isCameraActive: boolean;
  onMicToggle: () => void;
  onCameraToggle: () => void;
  disabled?: boolean;
}

export default function AudioControls({
  isMicActive,
  isCameraActive,
  onMicToggle,
  onCameraToggle,
  disabled = false,
}: AudioControlsProps) {
  return (
    <div className="flex items-center gap-4">
      {/* Microphone Button */}
      <button
        onClick={onMicToggle}
        disabled={disabled}
        className={`p-4 rounded-full transition-all ${
          isMicActive
            ? 'bg-green-500 hover:bg-green-600 text-white'
            : 'bg-red-500 hover:bg-red-600 text-white'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:scale-110'}`}
        title={isMicActive ? 'Mute Microphone' : 'Unmute Microphone'}
      >
        {isMicActive ? (
          <svg
            className="w-6 h-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
            />
          </svg>
        ) : (
          <svg
            className="w-6 h-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2"
            />
          </svg>
        )}
      </button>

      {/* Camera Button */}
      <button
        onClick={onCameraToggle}
        disabled={disabled}
        className={`p-4 rounded-full transition-all ${
          isCameraActive
            ? 'bg-green-500 hover:bg-green-600 text-white'
            : 'bg-red-500 hover:bg-red-600 text-white'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:scale-110'}`}
        title={isCameraActive ? 'Turn Off Camera' : 'Turn On Camera'}
      >
        {isCameraActive ? (
          <svg
            className="w-6 h-6"
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
        ) : (
          <svg
            className="w-6 h-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"
            />
          </svg>
        )}
      </button>

      {/* Status indicators */}
      <div className="flex flex-col gap-1 text-xs">
        <div className="flex items-center gap-2">
          <span
            className={`w-2 h-2 rounded-full ${
              isMicActive ? 'bg-green-500' : 'bg-red-500'
            }`}
          ></span>
          <span className="text-gray-600">
            {isMicActive ? 'Mic On' : 'Mic Off'}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`w-2 h-2 rounded-full ${
              isCameraActive ? 'bg-green-500' : 'bg-red-500'
            }`}
          ></span>
          <span className="text-gray-600">
            {isCameraActive ? 'Camera On' : 'Camera Off'}
          </span>
        </div>
      </div>
    </div>
  );
}
