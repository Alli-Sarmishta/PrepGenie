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
  const [status, setStatus] = useState('Connecting...');
  const [isProcessing, setIsProcessing] = useState(false);
  const sessionIdRef = useRef<string | null>(null);
  const hasStartedSetup = useRef(false);
  const audioPlaybackPromiseRef = useRef<Promise<void> | null>(null);

  const { playAudio, stopAudio } = useAudioPlayer();

  // Handle WebSocket messages
  const handleWSMessage = useCallback(async (data: any) => {
    const timestamp = new Date().toISOString();
    console.log(`\n[${timestamp}] 📥 CLIENT: Received WS message:`, data);

    switch (data.type) {
      case 'AI_SPEAKING':
        console.log(`[${timestamp}] 🤖 AI_SPEAKING received`);
        console.log(`[${timestamp}] 📝 Text: "${data.text?.substring(0, 100)}..."`);
        console.log(`[${timestamp}] 🎵 Has audio: ${!!data.audio}`);
        console.log(`[${timestamp}] 🆔 SessionId: ${data.sessionId}`);
        
        setAiText(data.text);
        setAiSpeaking(true);
        setStatus('AI Speaking...');
        
        if (data.sessionId) {
          sessionIdRef.current = data.sessionId;
          console.log(`[${timestamp}] 💾 Session ID saved: ${data.sessionId}`);
        }
        
        if (data.audio) {
          console.log(`[${timestamp}] 🔊 Audio data length: ${data.audio.length} chars`);
          try {
            console.log(`[${timestamp}] ▶️ Starting audio playback...`);
            // Store the audio playback promise so we can wait for it later
            audioPlaybackPromiseRef.current = playAudio(data.audio);
            await audioPlaybackPromiseRef.current;
            console.log(`[${timestamp}] ✅ Audio playback completed`);
            audioPlaybackPromiseRef.current = null;
            setAiSpeaking(false);
            setStatus('Listening...');
          } catch (error) {
            console.error(`[${timestamp}] ❌ Failed to play audio:`, error);
            audioPlaybackPromiseRef.current = null;
            setAiSpeaking(false);
            setStatus('Listening...');
          }
        } else {
          console.warn(`[${timestamp}] ⚠️ No audio data in AI_SPEAKING message`);
          setTimeout(() => {
            setAiSpeaking(false);
            setStatus('Listening...');
          }, 3000);
        }
        break;

      case 'TRANSCRIPT':
        console.log(`[${timestamp}] 📝 TRANSCRIPT received: ${data.text}`);
        setUserTranscript(data.text);
        setIsProcessing(false);
        setStatus('Waiting for AI response...');
        break;

      case 'QUESTION_PROGRESS':
        console.log(`[${timestamp}] 📊 Progress: ${data.current}/${data.total}`);
        setProgress({ current: data.current, total: data.total });
        break;

      case 'INTERVIEW_COMPLETED':
        console.log(`[${timestamp}] ✅ Interview completed!`);
        setInterviewId(data.interviewId);
        setIsCompleted(true);
        setStatus('Interview Completed! Please listen to the feedback...');
        
        // Stop recording immediately
        stopRecording();
        stopWebcam();
        
        // Wait for audio to finish, then navigate
        (async () => {
          if (data.interviewId) {
            console.log(`[${new Date().toISOString()}] ⏳ Waiting for feedback audio to complete...`);
            
            // Wait for the audio playback promise to complete
            if (audioPlaybackPromiseRef.current) {
              await audioPlaybackPromiseRef.current;
              console.log(`[${new Date().toISOString()}] ✅ Audio finished playing`);
            }
            
            // Add a 2-second buffer for user to read the completion message
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            console.log(`[${new Date().toISOString()}] ✅ Navigating to results...`);
            navigate(`/results/${data.interviewId}`);
          }
        })();
        break;

      case 'INTERVIEW_TERMINATED':
        console.log(`[${timestamp}] 🛑 Interview terminated`);
        setInterviewId(data.interviewId);
        setIsCompleted(true);
        setStatus('Interview Ended');
        
        // Stop recording immediately
        stopRecording();
        stopWebcam();
        
        // Wait for audio to finish, then navigate
        (async () => {
          console.log(`[${new Date().toISOString()}] ⏳ Waiting for termination audio to complete...`);
          
          // Wait for the audio playback promise to complete
          if (audioPlaybackPromiseRef.current) {
            await audioPlaybackPromiseRef.current;
            console.log(`[${new Date().toISOString()}] ✅ Audio finished playing`);
          }
          
          // Add a 2-second buffer
          await new Promise(resolve => setTimeout(resolve, 2000));
          
          console.log(`[${new Date().toISOString()}] ✅ Navigating...`);
          if (data.interviewId) {
            navigate(`/results/${data.interviewId}`);
          } else {
            navigate('/dashboard');
          }
        })();
        break;

      case 'ERROR':
        console.error(`[${timestamp}] ❌ Error:`, data.message);
        setStatus(`Error: ${data.message}`);
        alert(`Error: ${data.message}`);
        break;

      default:
        console.log(`[${timestamp}] ⚠️ Unknown message type: ${data.type}`);
    }
  }, [navigate, playAudio]);

  // Handle audio data from microphone (push-to-talk)
  const handleAudioReady = useCallback(async (audioBlob: Blob) => {
    const timestamp = new Date().toISOString();
    
    try {
      console.log(`\n[${timestamp}] 🎤 CLIENT: Audio ready from push-to-talk`);
      console.log(`[${timestamp}] 📊 Blob size: ${audioBlob.size} bytes`);
      
      setIsProcessing(true);
      setStatus('Processing your answer...');
      setUserTranscript('Processing...');
      
      console.log(`[${timestamp}] 🔄 Converting to base64...`);
      const base64Audio = await blobToBase64(audioBlob);
      console.log(`[${timestamp}] ✅ Base64 length: ${base64Audio.length} chars`);
      console.log(`[${timestamp}] 📤 Sending AUDIO_CHUNK message...`);
      
      sendMessageRef.current?.({
        type: 'AUDIO_CHUNK',
        audioData: base64Audio,
        sessionId: sessionIdRef.current
      });
      
      console.log(`[${timestamp}] ✅ Audio chunk sent successfully`);
    } catch (error) {
      console.error(`[${timestamp}] ❌ Failed to send audio:`, error);
      setIsProcessing(false);
      setStatus('Error sending audio');
    }
  }, []);

  const { sendMessage, isConnected } = useWebSocket({
    onMessage: handleWSMessage,
  });

  // Store sendMessage in ref for use in callbacks
  const sendMessageRef = useRef(sendMessage);
  useEffect(() => {
    sendMessageRef.current = sendMessage;
  }, [sendMessage]);

  const {
    isRecording,
    isInitialized: isMicInitialized,
    initialize: initializeMic,
    startRecording,
    stopRecording,
    cleanup: cleanupMic
  } = usePushToTalkRecording({
    onAudioReady: handleAudioReady
  });

  const {
    isActive: isCameraActive,
    videoRef,
    startWebcam,
    stopWebcam,
  } = useWebcam();

  // Initialize interview when connected
  useEffect(() => {
    const timestamp = new Date().toISOString();
    
    if (isConnected && !hasStartedSetup.current) {
      hasStartedSetup.current = true;
      
      console.log(`\n[${timestamp}] 🎬 CLIENT: WebSocket connected, initializing interview...`);
      setStatus('Connected! Initializing...');
      
      // Initialize microphone and webcam
      setTimeout(async () => {
        console.log(`[${timestamp}] 📹 Starting webcam...`);
        startWebcam();
        
        console.log(`[${timestamp}] 🎤 Initializing microphone...`);
        try {
          await initializeMic();
          console.log(`[${timestamp}] ✅ Microphone ready`);
        } catch (err) {
          console.error('Failed to initialize microphone:', err);
        }
        
        // Start setup phase
        console.log(`[${timestamp}] 📤 Sending START_SETUP message...`);
        sendMessage({ type: 'START_SETUP' });
        setIsInitialized(true);
        setStatus('AI is preparing...');
        console.log(`[${timestamp}] ✅ Initialization complete`);
      }, 500);
    }
  }, [isConnected, sendMessage, startWebcam, initializeMic]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      console.log(`[${new Date().toISOString()}] 🧹 Cleaning up interview resources...`);
      cleanupMic();
      stopWebcam();
      stopAudio();
    };
  }, [cleanupMic, stopWebcam, stopAudio]);

  // Spacebar keyboard shortcut for push-to-talk
  useEffect(() => {
    if (!isInitialized || aiSpeaking || isCompleted || isProcessing) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !e.repeat && !isRecording) {
        e.preventDefault();
        console.log(`[${new Date().toISOString()}] ⌨️ Spacebar pressed - starting recording`);
        startRecording();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space' && isRecording) {
        e.preventDefault();
        console.log(`[${new Date().toISOString()}] ⌨️ Spacebar released - stopping recording`);
        stopRecording();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [isInitialized, aiSpeaking, isCompleted, isProcessing, isRecording, startRecording, stopRecording]);

  function blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = (reader.result as string).split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  const handleEndInterview = () => {
    if (confirm('Are you sure you want to end the interview?')) {
      sendMessage({ type: 'END_INTERVIEW' });
    }
  };

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">Connecting to PrepGenie...</p>
        </div>
      </div>
    );
  }

  if (isCompleted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-2xl">
          <div className="bg-green-100 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-4">
            <svg className="w-10 h-10 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Interview Completed!</h2>
          <p className="text-gray-600 mb-2">{aiText}</p>
          <p className="text-sm text-gray-500">Redirecting to results...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50">
      {/* Header */}
      <header className="bg-white border-b border-neutral-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-4">
              {progress && (
                <span className="text-sm font-medium text-neutral-700">
                  Question {progress.current} <span className="text-neutral-400">/ {progress.total}</span>
                </span>
              )}
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 px-3 py-1.5 bg-neutral-50 rounded-lg">
                <span className={`w-2 h-2 rounded-full ${aiSpeaking ? 'bg-blue-500 animate-pulse' : isRecording ? 'bg-red-500 animate-pulse' : 'bg-green-500'}`}></span>
                <span className="text-xs font-medium text-neutral-700">{status}</span>
              </div>
              <Button variant="ghost" size="sm" onClick={handleEndInterview}>
                End Interview
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Interview Area */}
          <div className="lg:col-span-2 space-y-6">
            {/* AI Conversation Card */}
            <div className="card p-8 min-h-[400px]">
              <div className="flex flex-col items-center justify-center h-full">
                <Avatar isSpeaking={aiSpeaking} />
                
                {/* Conversation */}
                <div className="mt-12 w-full max-w-2xl space-y-4">
                  {aiText && (
                    <div className="bg-blue-50 border border-blue-100 rounded-xl p-5">
                      <div className="flex items-start gap-3">
                        <div className="w-6 h-6 bg-blue-600 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                          <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                          </svg>
                        </div>
                        <div className="flex-1">
                          <p className="text-xs font-medium text-blue-900 mb-1">PrepGenie</p>
                          <p className="text-sm text-neutral-800 leading-relaxed">{aiText}</p>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {userTranscript && (
                    <div className="bg-neutral-50 border border-neutral-200 rounded-xl p-5">
                      <div className="flex items-start gap-3">
                        <div className="w-6 h-6 bg-neutral-300 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                          <svg className="w-4 h-4 text-neutral-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                        </div>
                        <div className="flex-1">
                          <p className="text-xs font-medium text-neutral-600 mb-1">You</p>
                          <p className="text-sm text-neutral-800 leading-relaxed italic">"{userTranscript}"</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Push-to-Talk Control */}
            <div className="card p-6">
              <div className="flex flex-col items-center">
                <p className="text-sm text-neutral-600 mb-6 text-center font-medium">
                  {aiSpeaking ? 'AI is speaking...' : isProcessing ? 'Processing your answer...' : 'Hold to speak'}
                </p>
                
                <button
                  onMouseDown={startRecording}
                  onMouseUp={stopRecording}
                  onMouseLeave={stopRecording}
                  onTouchStart={startRecording}
                  onTouchEnd={stopRecording}
                  disabled={aiSpeaking || isProcessing || !isMicInitialized}
                  className={`
                    w-28 h-28 rounded-full flex items-center justify-center
                    transition-all duration-200 transform
                    ${isRecording 
                      ? 'bg-red-500 scale-110 shadow-lg ring-4 ring-red-100' 
                      : aiSpeaking || isProcessing
                      ? 'bg-neutral-200 cursor-not-allowed'
                      : 'bg-blue-600 hover:bg-blue-700 hover:scale-105 shadow-md hover:shadow-lg'
                    }
                    ${!aiSpeaking && !isProcessing ? 'active:scale-95' : ''}
                    disabled:opacity-50 disabled:cursor-not-allowed
                  `}
                >
                  <svg 
                    className={`w-14 h-14 text-white ${isRecording ? 'animate-pulse' : ''}`} 
                    fill="none" 
                    viewBox="0 0 24 24" 
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path 
                      strokeLinecap="round" 
                      strokeLinejoin="round" 
                      d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" 
                    />
                  </svg>
                </button>
                
                <div className="mt-4 text-center">
                  <p className="text-xs font-medium text-neutral-900">
                    {isRecording ? 'Recording...' : 'Press and hold'}
                  </p>
                  <p className="text-xs text-neutral-500 mt-1">
                    Use mic button or <kbd className="px-1.5 py-0.5 bg-neutral-100 border border-neutral-300 rounded text-xs font-mono">SPACE</kbd>
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1 space-y-6">
            {/* Webcam Preview */}
            <div className="card p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-neutral-900">Your Video</h3>
                <button
                  type="button"
                  onClick={() => {
                    if (isCameraActive) {
                      stopWebcam();
                    } else {
                      startWebcam().catch((err) => console.error('Could not start camera:', err));
                    }
                  }}
                  className={`
                    inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium
                    transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2
                    ${isCameraActive
                      ? 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
                      : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                    }
                  `}
                  title={isCameraActive ? 'Turn camera off' : 'Turn camera on'}
                >
                  {isCameraActive ? (
                    <>
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                      Camera on
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                      </svg>
                      Camera off
                    </>
                  )}
                </button>
              </div>
              <WebcamPreview
                videoRef={videoRef}
                isActive={isCameraActive}
                className="aspect-video rounded-lg overflow-hidden"
              />
            </div>

            {/* Instructions */}
            <div className="card p-5">
              <h3 className="text-sm font-semibold text-neutral-900 mb-3">How it works</h3>
              <ul className="space-y-3">
                <li className="flex items-start gap-2.5 text-sm">
                  <div className="w-5 h-5 bg-blue-100 rounded-md flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-xs font-bold text-blue-600">1</span>
                  </div>
                  <span className="text-neutral-700">Listen to the AI question</span>
                </li>
                <li className="flex items-start gap-2.5 text-sm">
                  <div className="w-5 h-5 bg-blue-100 rounded-md flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-xs font-bold text-blue-600">2</span>
                  </div>
                  <span className="text-neutral-700">Hold mic button to speak</span>
                </li>
                <li className="flex items-start gap-2.5 text-sm">
                  <div className="w-5 h-5 bg-blue-100 rounded-md flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-xs font-bold text-blue-600">3</span>
                  </div>
                  <span className="text-neutral-700">Release when finished</span>
                </li>
                <li className="flex items-start gap-2.5 text-sm">
                  <div className="w-5 h-5 bg-blue-100 rounded-md flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-xs font-bold text-blue-600">4</span>
                  </div>
                  <span className="text-neutral-700">AI analyzes and continues</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
