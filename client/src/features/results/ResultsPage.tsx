import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { interviewAPI } from '../../lib/api';
import Button from '../../components/Button';

interface Feedback {
  strengths: string[];
  weaknesses: string[];
  improvements: string[];
  summary: string;
  score: number;
}

interface Interview {
  id: string;
  role: string;
  interviewType: string;
  status: string;
  createdAt: string;
  feedback?: Feedback;
}

export default function ResultsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [interview, setInterview] = useState<Interview | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchInterview();
  }, [id]);

  const fetchInterview = async () => {
    try {
      const response = await interviewAPI.getById(id!);
      setInterview(response.data.interview);
    } catch (error) {
      console.error('Failed to fetch interview:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">Loading results...</p>
        </div>
      </div>
    );
  }

  if (!interview || !interview.feedback) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Feedback not available yet</p>
          <Button onClick={() => navigate('/dashboard')} className="mt-4">
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  const { feedback } = interview;
  const scoreColor = feedback.score >= 75 ? 'text-green-600' : feedback.score >= 50 ? 'text-yellow-600' : 'text-red-600';
  const scoreBgColor = feedback.score >= 75 ? 'bg-green-100' : feedback.score >= 50 ? 'bg-yellow-100' : 'bg-red-100';

  return (
    <div className="min-h-screen bg-neutral-50">
      {/* Header */}
      <header className="bg-white border-b border-neutral-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center h-16">
            <button
              onClick={() => navigate('/dashboard')}
              className="inline-flex items-center gap-2 text-sm text-neutral-600 hover:text-neutral-900 font-medium transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Dashboard
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header Section */}
        <div className="mb-8">
          <div className="flex items-center gap-2 text-sm text-neutral-600 mb-3">
            <span>Interview Results</span>
            <span>•</span>
            <span>{new Date(interview.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
          </div>
          <h1 className="text-3xl font-bold text-neutral-900 tracking-tight mb-2">{interview.role}</h1>
          <p className="text-neutral-600">{interview.interviewType} Interview</p>
        </div>

        {/* Score Card */}
        <div className="card p-8 mb-8 text-center">
          <div className="inline-flex items-center justify-center w-32 h-32 rounded-full bg-gradient-to-br from-blue-50 to-indigo-50 mb-4">
            <div className={`text-5xl font-bold ${scoreColor}`}>
              {feedback.score}
            </div>
          </div>
          <h2 className="text-lg font-semibold text-neutral-900 mb-1">Overall Score</h2>
          <p className="text-sm text-neutral-600">
            {feedback.score >= 75 ? 'Excellent performance!' : feedback.score >= 50 ? 'Good effort!' : 'Keep practicing!'}
          </p>
        </div>

        {/* Summary */}
        <div className="card p-6 mb-6">
          <h3 className="text-base font-semibold text-neutral-900 mb-3">Summary</h3>
          <p className="text-neutral-700 leading-relaxed">{feedback.summary}</p>
        </div>

        {/* Feedback Grid */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          {/* Strengths */}
          <div className="card p-6">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                <svg className="w-4 h-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-base font-semibold text-neutral-900">Strengths</h3>
            </div>
            <ul className="space-y-2.5">
              {feedback.strengths.map((strength, index) => (
                <li key={index} className="flex items-start gap-2 text-sm">
                  <span className="text-green-600 mt-0.5 flex-shrink-0">✓</span>
                  <span className="text-neutral-700">{strength}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Weaknesses */}
          <div className="card p-6">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center">
                <svg className="w-4 h-4 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h3 className="text-base font-semibold text-neutral-900">Areas to Improve</h3>
            </div>
            <ul className="space-y-2.5">
              {feedback.weaknesses.map((weakness, index) => (
                <li key={index} className="flex items-start gap-2 text-sm">
                  <span className="text-amber-600 mt-0.5 flex-shrink-0">!</span>
                  <span className="text-neutral-700">{weakness}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Recommendations */}
          <div className="card p-6">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                <svg className="w-4 h-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="text-base font-semibold text-neutral-900">Next Steps</h3>
            </div>
            <ul className="space-y-2.5">
              {feedback.improvements.map((improvement, index) => (
                <li key={index} className="flex items-start gap-2 text-sm">
                  <span className="text-blue-600 mt-0.5 flex-shrink-0">→</span>
                  <span className="text-neutral-700">{improvement}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 justify-center">
          <Button onClick={() => navigate('/interview/voice')} size="lg">
            Start New Interview
          </Button>
          <Button variant="secondary" size="lg" onClick={() => navigate('/dashboard')}>
            Back to Dashboard
          </Button>
        </div>
      </main>
    </div>
  );
}
