import { useEffect, useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWebSocket } from '../../hooks/useWebSocket';
import { usePushToTalkRecording } from '../../hooks/usePushToTalkRecording';
import { useAudioPlayer } from '../../hooks/useAudioPlayer';
import { useWebcam } from '../../hooks/useWebcam';
import Avatar from '../../components/Avatar';
import WebcamPreview from '../../components/WebcamPreview';
import Button from '../../components/Button';

export default function VoiceInterviewPage() {
  const navigate = useNavigate();

  const [aiSpeaking, setAiSpeaking] = useState(false);
  const [aiText, setAiText] = useState('');
  const [userTranscript, setUserTranscript] = useState('');
  const [interviewId, setInterviewId] = useState<string | null>(null);
  const [progress, setProgress] = useState<{ current: number; total: number } | null>(null);
  const [isCompleted, setIsCompleted] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [status, setStatus] = useState('Connecting…');
  const [isProcessing, setIsProcessing] = useState(false);

  const sessionIdRef = useRef<string | null>(null);
  const hasStartedSetup = useRef(false);
  const audioPlaybackPromiseRef = useRef<Promise<void> | null>(null);

  const { playAudio, stopAudio } = useAudioPlayer();

  const handleWSMessage = useCallback(async (data: any) => {
    const ts = new Date().toISOString();
    console.log(`\n[${ts}] 📥 WS:`, data);
    switch (data.type) {
      case 'AI_SPEAKING':
        setAiText(data.text); setAiSpeaking(true); setStatus('AI Speaking…');
        if (data.sessionId) sessionIdRef.current = data.sessionId;
        if (data.audio) {
          try {
            audioPlaybackPromiseRef.current = playAudio(data.audio);
            await audioPlaybackPromiseRef.current;
            audioPlaybackPromiseRef.current = null;
            setAiSpeaking(false); setStatus('Listening…');
          } catch {
            audioPlaybackPromiseRef.current = null;
            setAiSpeaking(false); setStatus('Listening…');
          }
        } else {
          setTimeout(() => { setAiSpeaking(false); setStatus('Listening…'); }, 3000);
        }
        break;
      case 'TRANSCRIPT':
        setUserTranscript(data.text); setIsProcessing(false); setStatus('Waiting for AI response…');
        break;
      case 'QUESTION_PROGRESS':
        setProgress({ current: data.current, total: data.total });
        break;
      case 'INTERVIEW_COMPLETED':
        setInterviewId(data.interviewId); setIsCompleted(true);
        setStatus('Interview Completed!');
        stopRecording(); stopWebcam();
        (async () => {
          if (data.interviewId) {
            if (audioPlaybackPromiseRef.current) await audioPlaybackPromiseRef.current;
            await new Promise(r => setTimeout(r, 2000));
            navigate(`/results/${data.interviewId}`);
          }
        })();
        break;
      case 'INTERVIEW_TERMINATED':
        setInterviewId(data.interviewId); setIsCompleted(true); setStatus('Interview Ended');
        stopRecording(); stopWebcam();
        (async () => {
          if (audioPlaybackPromiseRef.current) await audioPlaybackPromiseRef.current;
          await new Promise(r => setTimeout(r, 2000));
          if (data.interviewId) navigate(`/results/${data.interviewId}`);
          else navigate('/dashboard');
        })();
        break;
      case 'ERROR':
        setStatus(`Error: ${data.message}`);
        alert(`Error: ${data.message}`);
        break;
    }
  }, [navigate, playAudio]);

  const handleAudioReady = useCallback(async (audioBlob: Blob) => {
    try {
      setIsProcessing(true); setStatus('Processing your answer…'); setUserTranscript('Processing…');
      const base64Audio = await blobToBase64(audioBlob);
      sendMessageRef.current?.({ type: 'AUDIO_CHUNK', audioData: base64Audio, sessionId: sessionIdRef.current });
    } catch {
      setIsProcessing(false); setStatus('Error sending audio');
    }
  }, []);

  const { sendMessage, isConnected } = useWebSocket({ onMessage: handleWSMessage });
  const sendMessageRef = useRef(sendMessage);
  useEffect(() => { sendMessageRef.current = sendMessage; }, [sendMessage]);

  const { isRecording, isInitialized: isMicInitialized, initialize: initializeMic, startRecording, stopRecording, cleanup: cleanupMic } = usePushToTalkRecording({ onAudioReady: handleAudioReady });
  const { isActive: isCameraActive, videoRef, startWebcam, stopWebcam } = useWebcam();

  useEffect(() => {
    if (isConnected && !hasStartedSetup.current) {
      hasStartedSetup.current = true;
      setStatus('Connected! Initializing…');
      setTimeout(async () => {
        startWebcam();
        try { await initializeMic(); } catch (err) { console.error('Mic init failed:', err); }
        sendMessage({ type: 'START_SETUP' });
        setIsInitialized(true); setStatus('AI is preparing…');
      }, 500);
    }
  }, [isConnected, sendMessage, startWebcam, initializeMic]);

  useEffect(() => {
    return () => { cleanupMic(); stopWebcam(); stopAudio(); };
  }, [cleanupMic, stopWebcam, stopAudio]);

  useEffect(() => {
    if (!isInitialized || aiSpeaking || isCompleted || isProcessing) return;
    const keyDown = (e: KeyboardEvent) => { if (e.code === 'Space' && !e.repeat && !isRecording) { e.preventDefault(); startRecording(); } };
    const keyUp = (e: KeyboardEvent) => { if (e.code === 'Space' && isRecording) { e.preventDefault(); stopRecording(); } };
    window.addEventListener('keydown', keyDown);
    window.addEventListener('keyup', keyUp);
    return () => { window.removeEventListener('keydown', keyDown); window.removeEventListener('keyup', keyUp); };
  }, [isInitialized, aiSpeaking, isCompleted, isProcessing, isRecording, startRecording, stopRecording]);

  function blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  const handleEndInterview = () => {
    if (confirm('Are you sure you want to end the interview?')) sendMessage({ type: 'END_INTERVIEW' });
  };

  /* ─── Loading ─────────────────────────────────────────────── */
  if (!isConnected) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg-page)' }}>
        <div className="text-center animate-fade-up">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-5 shadow-card-md" style={{ background: 'var(--bg-card)' }}>
            <div className="w-8 h-8 border-2 rounded-full animate-spin" style={{ borderColor: 'var(--border)', borderTopColor: '#6366f1' }} />
          </div>
          <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>Connecting to PrepGenie…</p>
          <p className="text-sm mt-1" style={{ color: 'var(--text-tertiary)' }}>Setting up your interview session</p>
        </div>
      </div>
    );
  }

  /* ─── Completed ────────────────────────────────────────────── */
  if (isCompleted) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'var(--bg-page)' }}>
        <div className="text-center max-w-md animate-scale-in">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full mb-5" style={{ background: 'rgba(74,222,128,.1)' }}>
            <svg className="w-10 h-10 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold tracking-tight mb-2" style={{ color: 'var(--text-primary)' }}>Interview Complete!</h2>
          {aiText && <p className="mb-3" style={{ color: 'var(--text-secondary)' }}>{aiText}</p>}
          <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>Redirecting to your results…</p>
          <div className="mt-4 w-9 h-9 border-2 rounded-full animate-spin mx-auto" style={{ borderColor: 'var(--border)', borderTopColor: '#6366f1' }} />
        </div>
      </div>
    );
  }

  /* ─── Main ─────────────────────────────────────────────────── */
  return (
    <div className="min-h-screen bg-hero-mesh" style={{ background: 'var(--bg-page)' }}>
      {/* Nav */}
      <header className="page-header">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-brand-600 to-violet-600 flex items-center justify-center">
                <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <span className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>PrepGenie</span>
            </div>

            <div className="flex items-center gap-3">
              {/* Progress dots */}
              {progress && (
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium" style={{ color: 'var(--text-tertiary)' }}>Q</span>
                  <span className="flex items-center gap-0.5">
                    {Array.from({ length: progress.total }).map((_, i) => (
                      <span key={i} className={`block h-1.5 w-4 rounded-full transition-colors duration-300 ${i < progress.current ? 'bg-brand-500' : ''
                        }`} style={i < progress.current ? {} : { background: 'var(--border)' }} />
                    ))}
                  </span>
                  <span className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>{progress.current}/{progress.total}</span>
                </div>
              )}

              {/* Status pill */}
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
                <span className={`w-2 h-2 rounded-full ${aiSpeaking ? 'bg-brand-400 animate-pulse' : isRecording ? 'bg-red-400 animate-pulse' : 'bg-emerald-400'
                  }`} />
                <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>{status}</span>
              </div>

              <Button variant="ghost" size="sm" onClick={handleEndInterview}>End Interview</Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Main area */}
          <div className="lg:col-span-2 space-y-5">
            {/* AI chat card */}
            <div className="card p-8 min-h-[380px] flex flex-col items-center">
              <Avatar isSpeaking={aiSpeaking} />
              <div className="mt-10 w-full max-w-2xl space-y-4">
                {aiText && (
                  <div className="rounded-2xl p-5 animate-fade-up" style={{ background: 'rgba(99,102,241,.08)', border: '1px solid rgba(99,102,241,.18)' }}>
                    <div className="flex items-start gap-3">
                      <div className="w-7 h-7 flex-shrink-0 mt-0.5 rounded-lg bg-gradient-to-br from-brand-600 to-violet-600 flex items-center justify-center">
                        <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                        </svg>
                      </div>
                      <div className="flex-1">
                        <p className="text-[11px] font-semibold mb-1.5 uppercase tracking-wider text-brand-400">PrepGenie AI</p>
                        <p className="text-sm leading-relaxed" style={{ color: 'var(--text-primary)' }}>{aiText}</p>
                      </div>
                    </div>
                  </div>
                )}
                {userTranscript && (
                  <div className="rounded-2xl p-5 ml-8 animate-fade-up" style={{ background: 'rgba(255,255,255,.03)', border: '1px solid var(--border)' }}>
                    <div className="flex items-start gap-3">
                      <div className="w-7 h-7 flex-shrink-0 mt-0.5 rounded-lg flex items-center justify-center" style={{ background: 'rgba(255,255,255,.08)' }}>
                        <svg className="w-3.5 h-3.5" style={{ color: 'var(--text-secondary)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                      </div>
                      <div className="flex-1">
                        <p className="text-[11px] font-semibold mb-1.5 uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>You</p>
                        <p className="text-sm leading-relaxed italic" style={{ color: 'var(--text-secondary)' }}>"{userTranscript}"</p>
                      </div>
                    </div>
                  </div>
                )}
                {!aiText && !userTranscript && (
                  <div className="text-center py-6">
                    <p className="text-sm font-medium" style={{ color: 'var(--text-muted)' }}>Waiting for interview to begin…</p>
                  </div>
                )}
              </div>
            </div>

            {/* Push-to-talk */}
            <div className="card p-6">
              <div className="flex flex-col items-center">
                <p className="text-sm font-medium mb-6 text-center" style={{ color: 'var(--text-secondary)' }}>
                  {aiSpeaking ? '🎙️ AI is speaking — please wait'
                    : isProcessing ? '⏳ Processing your answer…'
                      : '🎤 Hold the button to speak your answer'}
                </p>

                <button
                  onMouseDown={startRecording}
                  onMouseUp={stopRecording}
                  onMouseLeave={stopRecording}
                  onTouchStart={startRecording}
                  onTouchEnd={stopRecording}
                  disabled={aiSpeaking || isProcessing || !isMicInitialized}
                  aria-label="Push to talk"
                  className={[
                    'w-24 h-24 rounded-full flex items-center justify-center transition-all duration-200',
                    isRecording
                      ? 'bg-red-500 scale-105'
                      : aiSpeaking || isProcessing
                        ? 'cursor-not-allowed opacity-50'
                        : 'bg-gradient-to-br from-brand-500 to-violet-600 hover:scale-105',
                    !aiSpeaking && !isProcessing ? 'active:scale-95' : '',
                    'disabled:opacity-50 disabled:cursor-not-allowed',
                  ].join(' ')}
                  style={isRecording ? { boxShadow: '0 0 0 8px rgba(239,68,68,.2)' } : !aiSpeaking && !isProcessing ? { boxShadow: '0 0 28px rgba(99,102,241,.5)' } : { background: 'var(--bg-elevated)' }}
                >
                  <svg className={`w-11 h-11 text-white ${isRecording ? 'animate-pulse' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                  </svg>
                </button>

                <div className="mt-5 text-center">
                  <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                    {isRecording ? 'Recording…' : 'Press & hold to speak'}
                  </p>
                  <p className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>
                    Or use{' '}
                    <kbd className="px-1.5 py-0.5 rounded text-xs font-mono" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>
                      SPACE
                    </kbd>
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1 space-y-5">
            {/* Webcam */}
            <div className="card p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Your Video</h3>
                <button
                  type="button"
                  onClick={() => { if (isCameraActive) stopWebcam(); else startWebcam().catch(console.error); }}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors"
                  style={isCameraActive
                    ? { background: 'rgba(255,255,255,.06)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }
                    : { background: 'rgba(99,102,241,.12)', color: '#a5b4fc', border: '1px solid rgba(99,102,241,.25)' }}
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    {isCameraActive ? (
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    ) : (
                      <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                    )}
                  </svg>
                  {isCameraActive ? 'Camera on' : 'Camera off'}
                </button>
              </div>
              <WebcamPreview videoRef={videoRef} isActive={isCameraActive} className="aspect-video rounded-xl overflow-hidden" />
            </div>

            {/* How it works */}
            <div className="card p-5">
              <h3 className="text-sm font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>How it works</h3>
              <ul className="space-y-3">
                {["Listen to the AI interviewer's question", "Hold the mic button (or SPACE) to speak", "Release when you're finished answering", "AI analyzes your answer and continues"].map((step, i) => (
                  <li key={i} className="flex items-start gap-3 text-sm">
                    <span className="flex-shrink-0 w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-bold text-brand-400" style={{ background: 'rgba(99,102,241,.15)' }}>
                      {i + 1}
                    </span>
                    <span className="leading-snug" style={{ color: 'var(--text-secondary)' }}>{step}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
