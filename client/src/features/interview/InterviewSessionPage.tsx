import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useWebSocket } from '../../hooks/useWebSocket';
import { useMicRecorder } from '../../hooks/useMicRecorder';
import { useWebcam } from '../../hooks/useWebcam';
import Avatar from '../../components/Avatar';
import WebcamPreview from '../../components/WebcamPreview';
import AudioControls from '../../components/AudioControls';
import Button from '../../components/Button';

interface Message {
  type: string;
  text?: string;
  question?: string;
  questionNumber?: number;
  totalQuestions?: number;
}

export default function InterviewSessionPage() {
  const { id: interviewId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const [aiSpeaking, setAiSpeaking] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState('');
  const [questionNumber, setQuestionNumber] = useState(0);
  const [totalQuestions, setTotalQuestions] = useState(0);
  const [transcript, setTranscript] = useState('');
  const [isStarted, setIsStarted] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);

  const { isConnected, sendMessage } = useWebSocket({
    onMessage: handleWSMessage,
  });

  const {
    isRecording,
    startRecording,
    stopRecording,
    blobToBase64,
  } = useMicRecorder();

  const {
    isActive: isCameraActive,
    videoRef,
    startWebcam,
    stopWebcam,
  } = useWebcam();

  useEffect(() => {
    // Initialize camera and mic on mount
    startWebcam();
  }, []);

  function handleWSMessage(data: Message) {
    console.log('WebSocket message:', data);

    switch (data.type) {
      case 'AI_SPEAKING':
        setAiSpeaking(true);
        setTranscript(data.text || '');
        // Play TTS audio here if provided
        setTimeout(() => setAiSpeaking(false), 3000); // Simulate speaking duration
        break;

      case 'TRANSCRIPT':
        setTranscript(data.text || '');
        break;

      case 'QUESTION':
        setCurrentQuestion(data.question || '');
        setQuestionNumber(data.questionNumber || 0);
        setTotalQuestions(data.totalQuestions || 0);
        setAiSpeaking(true);
        setTimeout(() => setAiSpeaking(false), 3000);
        break;

      case 'INTERVIEW_COMPLETED':
        setIsCompleted(true);
        break;

      case 'ERROR':
        console.error('WebSocket error:', data.text);
        break;
    }
  }

  const handleStartInterview = () => {
    if (!interviewId) return;
    
    sendMessage({
      type: 'START_INTERVIEW',
      interviewId,
    });
    
    setIsStarted(true);
  };

  const handleMicToggle = async () => {
    if (isRecording) {
      const audioBlob = await stopRecording();
      const base64Audio = await blobToBase64(audioBlob);
      
      // Send audio to backend
      sendMessage({
        type: 'AUDIO_CHUNK',
        audioData: base64Audio,
      });
    } else {
      startRecording((blob) => {
        // Optional: handle real-time chunks
      });
    }
  };

  const handleCameraToggle = () => {
    if (isCameraActive) {
      stopWebcam();
    } else {
      startWebcam();
    }
  };

  const handleNextQuestion = () => {
    sendMessage({ type: 'NEXT_QUESTION' });
  };

  const handleEndInterview = () => {
    sendMessage({ type: 'END_INTERVIEW' });
    navigate(`/results/${interviewId}`);
  };

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">Connecting to interview session...</p>
        </div>
      </div>
    );
  }

  if (isCompleted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="bg-green-100 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-4">
            <svg className="w-10 h-10 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Interview Completed!</h2>
          <p className="text-gray-600 mb-6">Generating your feedback...</p>
          <Button onClick={() => navigate(`/results/${interviewId}`)}>
            View Results
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-3 sm:px-6 lg:px-8 flex justify-between items-center">
          <div className="text-sm text-gray-600">
            {isStarted && totalQuestions > 0 && (
              <span>Question {questionNumber} of {totalQuestions}</span>
            )}
          </div>
          <Button variant="danger" onClick={handleEndInterview} className="text-sm">
            End Interview
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Center - AI Avatar */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl shadow-lg p-8 min-h-[500px] flex flex-col items-center justify-center">
              <Avatar isSpeaking={aiSpeaking} />
              
              {/* Current Question/Transcript */}
              <div className="mt-16 w-full max-w-2xl">
                {currentQuestion && (
                  <div className="bg-blue-50 rounded-lg p-6 mb-4">
                    <h3 className="font-semibold text-gray-700 mb-2">Current Question:</h3>
                    <p className="text-gray-800">{currentQuestion}</p>
                  </div>
                )}
                
                {transcript && (
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-sm text-gray-600">{transcript}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Controls */}
            <div className="mt-6 bg-white rounded-2xl shadow-lg p-6 flex justify-center items-center gap-6">
              <AudioControls
                isMicActive={isRecording}
                isCameraActive={isCameraActive}
                onMicToggle={handleMicToggle}
                onCameraToggle={handleCameraToggle}
                disabled={!isStarted}
              />
              
              {isStarted && (
                <Button onClick={handleNextQuestion} className="ml-4">
                  Next Question
                </Button>
              )}
            </div>
          </div>

          {/* Right Sidebar - Webcam Preview */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <h3 className="font-semibold text-gray-800 mb-4">Your Video</h3>
              <WebcamPreview
                videoRef={videoRef}
                isActive={isCameraActive}
                className="aspect-video"
              />

              {!isStarted && (
                <div className="mt-6">
                  <h3 className="font-semibold text-gray-800 mb-3">Ready to begin?</h3>
                  <p className="text-sm text-gray-600 mb-4">
                    Make sure your camera and microphone are working properly before starting.
                  </p>
                  <Button onClick={handleStartInterview} className="w-full">
                    Start Interview
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
