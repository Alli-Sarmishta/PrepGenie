interface AvatarProps {
  isSpeaking?: boolean;
  className?: string;
}

export default function Avatar({ isSpeaking = false, className = '' }: AvatarProps) {
  return (
    <div className={`flex items-center justify-center ${className}`}>
      <div className="relative">
        {/* Avatar circle */}
        <div
          className={`w-32 h-32 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center transition-all duration-300 ${
            isSpeaking ? 'scale-110 shadow-lg' : 'scale-100 shadow-md'
          }`}
        >
          {/* AI Icon */}
          <svg
            className="w-16 h-16 text-white"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
            />
          </svg>
        </div>

        {/* Speaking indicator - animated rings */}
        {isSpeaking && (
          <>
            <div className="absolute inset-0 rounded-full border-2 border-blue-400 animate-ping opacity-60"></div>
            <div className="absolute inset-0 rounded-full border-2 border-blue-300 animate-pulse opacity-40"></div>
          </>
        )}
      </div>

      {/* Status badge */}
      <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-10">
        <span
          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border ${
            isSpeaking
              ? 'bg-green-50 text-green-700 border-green-200'
              : 'bg-neutral-50 text-neutral-600 border-neutral-200'
          }`}
        >
          {isSpeaking && <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>}
          {isSpeaking ? 'Speaking' : 'Listening'}
        </span>
      </div>
    </div>
  );
}
