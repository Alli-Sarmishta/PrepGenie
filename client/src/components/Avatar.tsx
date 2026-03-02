interface AvatarProps {
  isSpeaking?: boolean;
  className?: string;
}

export default function Avatar({ isSpeaking = false, className = '' }: AvatarProps) {
  return (
    <div className={`flex flex-col items-center ${className}`}>
      <div className="relative inline-flex items-center justify-center">

        {/* Outer pulse rings when speaking */}
        {isSpeaking && (
          <>
            <div className="absolute w-52 h-52 rounded-full animate-ping" style={{ background: 'rgba(99,102,241,.08)' }} />
            <div className="absolute w-44 h-44 rounded-full animate-pulse" style={{ background: 'rgba(99,102,241,.13)' }} />
          </>
        )}

        {/* Glow ring */}
        <div
          className="absolute w-36 h-36 rounded-full transition-all duration-500"
          style={{
            background: isSpeaking
              ? 'conic-gradient(from 0deg, #6366f1, #8b5cf6, #6366f1)'
              : 'conic-gradient(from 0deg, rgba(99,102,241,.4), rgba(139,92,246,.4), rgba(99,102,241,.4))',
            filter: isSpeaking ? 'blur(12px)' : 'blur(8px)',
            opacity: isSpeaking ? 0.7 : 0.35,
          }}
        />

        {/* Main circle */}
        <div
          className="relative w-32 h-32 rounded-full flex items-center justify-center transition-all duration-300 overflow-hidden"
          style={{
            background: 'linear-gradient(145deg, #1e2038 0%, #161927 60%, #1a1d35 100%)',
            border: `2px solid ${isSpeaking ? 'rgba(99,102,241,.7)' : 'rgba(99,102,241,.3)'}`,
            boxShadow: isSpeaking
              ? '0 0 0 4px rgba(99,102,241,.2), 0 8px 40px rgba(99,102,241,.5), inset 0 1px 0 rgba(255,255,255,.05)'
              : '0 4px 24px rgba(99,102,241,.25), inset 0 1px 0 rgba(255,255,255,.04)',
            transform: isSpeaking ? 'scale(1.06)' : 'scale(1)',
          }}
        >
          {/* Robot / AI face SVG */}
          <svg
            viewBox="0 0 64 64"
            className="w-20 h-20"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            {/* Antenna */}
            <line x1="32" y1="6" x2="32" y2="14" stroke="#818cf8" strokeWidth="2" strokeLinecap="round" />
            <circle cx="32" cy="5" r="2.5" fill={isSpeaking ? '#a5b4fc' : '#6366f1'}>
              {isSpeaking && (
                <animate attributeName="r" values="2.5;4;2.5" dur="1s" repeatCount="indefinite" />
              )}
            </circle>

            {/* Head */}
            <rect x="14" y="14" width="36" height="30" rx="7" ry="7"
              fill="rgba(99,102,241,.12)" stroke="#6366f1" strokeWidth="1.5" />

            {/* Eyes */}
            {/* Left eye */}
            <rect x="19" y="22" width="10" height="7" rx="2"
              fill={isSpeaking ? '#a5b4fc' : '#818cf8'} opacity={isSpeaking ? '1' : '0.8'}>
              {isSpeaking && (
                <animate attributeName="opacity" values="1;0.5;1" dur="0.8s" repeatCount="indefinite" />
              )}
            </rect>
            {/* Left eye shine */}
            <rect x="20" y="23" width="3" height="2" rx="1" fill="white" opacity="0.6" />

            {/* Right eye */}
            <rect x="35" y="22" width="10" height="7" rx="2"
              fill={isSpeaking ? '#a5b4fc' : '#818cf8'} opacity={isSpeaking ? '1' : '0.8'}>
              {isSpeaking && (
                <animate attributeName="opacity" values="1;0.5;1" dur="0.8s" begin="0.4s" repeatCount="indefinite" />
              )}
            </rect>
            {/* Right eye shine */}
            <rect x="36" y="23" width="3" height="2" rx="1" fill="white" opacity="0.6" />

            {/* Mouth — changes when speaking */}
            {isSpeaking ? (
              /* Animated mouth bars */
              <g>
                <rect x="21" y="34" width="3" height="5" rx="1.5" fill="#818cf8">
                  <animate attributeName="height" values="5;8;3;7;5" dur="0.6s" repeatCount="indefinite" />
                  <animate attributeName="y" values="34;31;36;32;34" dur="0.6s" repeatCount="indefinite" />
                </rect>
                <rect x="26" y="33" width="3" height="7" rx="1.5" fill="#a5b4fc">
                  <animate attributeName="height" values="7;3;9;4;7" dur="0.6s" begin="0.1s" repeatCount="indefinite" />
                  <animate attributeName="y" values="33;36;31;35;33" dur="0.6s" begin="0.1s" repeatCount="indefinite" />
                </rect>
                <rect x="31" y="34" width="3" height="5" rx="1.5" fill="#818cf8">
                  <animate attributeName="height" values="5;9;3;8;5" dur="0.6s" begin="0.2s" repeatCount="indefinite" />
                  <animate attributeName="y" values="34;30;36;31;34" dur="0.6s" begin="0.2s" repeatCount="indefinite" />
                </rect>
                <rect x="36" y="33" width="3" height="7" rx="1.5" fill="#a5b4fc">
                  <animate attributeName="height" values="7;4;8;3;7" dur="0.6s" begin="0.3s" repeatCount="indefinite" />
                  <animate attributeName="y" values="33;35;31;36;33" dur="0.6s" begin="0.3s" repeatCount="indefinite" />
                </rect>
                <rect x="41" y="34" width="3" height="5" rx="1.5" fill="#818cf8">
                  <animate attributeName="height" values="5;7;3;9;5" dur="0.6s" begin="0.15s" repeatCount="indefinite" />
                  <animate attributeName="y" values="34;32;36;30;34" dur="0.6s" begin="0.15s" repeatCount="indefinite" />
                </rect>
              </g>
            ) : (
              /* Neutral straight mouth */
              <rect x="21" y="36" width="22" height="3" rx="1.5" fill="#6366f1" opacity="0.7" />
            )}

            {/* Side panels (ears) */}
            <rect x="9" y="20" width="5" height="10" rx="2"
              fill="rgba(99,102,241,.2)" stroke="#6366f1" strokeWidth="1" opacity="0.7" />
            <rect x="50" y="20" width="5" height="10" rx="2"
              fill="rgba(99,102,241,.2)" stroke="#6366f1" strokeWidth="1" opacity="0.7" />

            {/* Neck */}
            <rect x="27" y="44" width="10" height="6" rx="2"
              fill="rgba(99,102,241,.15)" stroke="#6366f1" strokeWidth="1" opacity="0.6" />

            {/* Body / chest plate */}
            <rect x="18" y="50" width="28" height="8" rx="4"
              fill="rgba(99,102,241,.1)" stroke="#6366f1" strokeWidth="1" opacity="0.5" />

            {/* Chest indicator dots */}
            <circle cx="27" cy="54" r="2" fill={isSpeaking ? '#4ade80' : '#6366f1'} opacity="0.8">
              {isSpeaking && <animate attributeName="opacity" values="0.8;0.3;0.8" dur="1s" repeatCount="indefinite" />}
            </circle>
            <circle cx="32" cy="54" r="2" fill={isSpeaking ? '#6366f1' : '#818cf8'} opacity="0.6" />
            <circle cx="37" cy="54" r="2" fill={isSpeaking ? '#4ade80' : '#6366f1'} opacity="0.8">
              {isSpeaking && <animate attributeName="opacity" values="0.8;0.3;0.8" dur="1s" begin="0.5s" repeatCount="indefinite" />}
            </circle>
          </svg>
        </div>
      </div>

      {/* Status badge */}
      <div className="mt-5">
        <span
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all duration-300"
          style={isSpeaking
            ? { background: 'rgba(99,102,241,.15)', color: '#a5b4fc', border: '1px solid rgba(99,102,241,.3)' }
            : { background: 'rgba(255,255,255,.04)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}
        >
          {isSpeaking ? (
            /* Equalizer bars */
            <span className="flex gap-0.5 items-end h-3">
              {[1, 2, 3].map((i) => (
                <span
                  key={i}
                  className="block w-0.5 rounded-full animate-bounce"
                  style={{
                    height: `${i === 2 ? 10 : 6}px`,
                    background: '#818cf8',
                    animationDelay: `${(i - 1) * 150}ms`,
                  }}
                />
              ))}
            </span>
          ) : (
            <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full" />
          )}
          {isSpeaking ? 'AI Speaking' : 'Listening'}
        </span>
      </div>
    </div>
  );
}
