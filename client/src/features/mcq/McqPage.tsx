import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { mcqAPI, type McqQuestionForClient, type McqSubmitResponse } from '../../lib/api';
import Button from '../../components/Button';

type Step = 'form' | 'quiz' | 'results';

export default function McqPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>('form');
  const [jobDescription, setJobDescription] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [questions, setQuestions] = useState<McqQuestionForClient[]>([]);
  const [answers, setAnswers] = useState<number[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<McqSubmitResponse | null>(null);

  const handleGenerate = async () => {
    const trimmed = jobDescription.trim();
    if (trimmed.length < 20) {
      setError('Please enter a meaningful job description (at least 20 characters).');
      return;
    }
    setError(null);
    setIsGenerating(true);
    try {
      const res = await mcqAPI.generate({
        jobDescription: trimmed,
        jobTitle: jobTitle.trim() || undefined,
      });
      setSessionId(res.data.sessionId);
      setQuestions(res.data.questions);
      setAnswers(res.data.questions.map(() => -1));
      setStep('quiz');
    } catch (err: unknown) {
      const msg = err && typeof err === 'object' && 'response' in err
        ? (err.response as { data?: { error?: string } })?.data?.error
        : null;
      setError(msg || 'Failed to generate questions. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const setAnswer = (questionIndex: number, optionIndex: number) => {
    setAnswers((prev) => {
      const next = [...prev];
      next[questionIndex] = optionIndex;
      return next;
    });
  };

  const handleSubmit = async () => {
    const allAnswered = answers.every((a) => a >= 0);
    if (!allAnswered) {
      setError('Please answer all questions before submitting.');
      return;
    }
    if (!sessionId) return;
    setError(null);
    setIsSubmitting(true);
    try {
      const res = await mcqAPI.submit({ sessionId, answers });
      setResult(res.data);
      setStep('results');
    } catch (err: unknown) {
      const msg = err && typeof err === 'object' && 'response' in err
        ? (err.response as { data?: { error?: string } })?.data?.error
        : null;
      setError(msg || 'Failed to submit. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    setStep('form');
    setSessionId(null);
    setQuestions([]);
    setAnswers([]);
    setResult(null);
    setError(null);
  };

  const scoreColor = result
    ? result.score >= 70
      ? 'text-green-600'
      : result.score >= 50
        ? 'text-amber-600'
        : 'text-red-600'
    : '';

  return (
    <div className="min-h-screen bg-neutral-50">
      <header className="bg-white border-b border-neutral-200">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center h-16">
            <button
              onClick={() => (step === 'form' ? navigate('/dashboard') : step === 'quiz' ? handleReset() : handleReset())}
              className="inline-flex items-center gap-2 text-sm text-neutral-600 hover:text-neutral-900 font-medium"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              {step === 'form' ? 'Dashboard' : 'Start over'}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-neutral-900 tracking-tight">MCQ Practice</h1>
          <p className="text-neutral-600 mt-1">
            Enter a job description to get 10 AI-generated questions (aptitude + job-related) and feedback
          </p>
        </div>

        {step === 'form' && (
          <div className="card p-6">
            <label className="block text-sm font-medium text-neutral-700 mb-2">Job Title (optional)</label>
            <input
              type="text"
              value={jobTitle}
              onChange={(e) => setJobTitle(e.target.value)}
              placeholder="e.g. Frontend Developer"
              className="w-full px-4 py-2.5 rounded-lg border border-neutral-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-neutral-900 placeholder-neutral-400 mb-4"
            />
            <label className="block text-sm font-medium text-neutral-700 mb-2">Job Description *</label>
            <textarea
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
              placeholder="Paste the full job description here. We'll generate 5 aptitude and 5 job-related MCQs."
              rows={6}
              className="w-full px-4 py-2.5 rounded-lg border border-neutral-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-neutral-900 placeholder-neutral-400 resize-y"
            />
            {error && (
              <p className="mt-3 text-sm text-red-600">{error}</p>
            )}
            <div className="mt-4">
              <Button onClick={handleGenerate} isLoading={isGenerating} disabled={isGenerating}>
                Generate 10 Questions
              </Button>
            </div>
          </div>
        )}

        {step === 'quiz' && (
          <div className="space-y-6">
            <p className="text-sm text-neutral-600">Answer all 10 questions, then submit.</p>
            {questions.map((q, qIndex) => (
              <div key={qIndex} className="card p-6">
                <p className="font-medium text-neutral-900 mb-4">
                  {qIndex + 1}. {q.question}
                </p>
                <div className="space-y-2">
                  {q.options.map((opt, oIndex) => (
                    <label
                      key={oIndex}
                      className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                        answers[qIndex] === oIndex
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-neutral-200 hover:border-neutral-300'
                      }`}
                    >
                      <input
                        type="radio"
                        name={`q-${qIndex}`}
                        checked={answers[qIndex] === oIndex}
                        onChange={() => setAnswer(qIndex, oIndex)}
                        className="w-4 h-4 text-blue-600"
                      />
                      <span className="text-neutral-800">{opt}</span>
                    </label>
                  ))}
                </div>
              </div>
            ))}
            {error && <p className="text-sm text-red-600">{error}</p>}
            <div className="flex gap-3">
              <Button onClick={handleSubmit} isLoading={isSubmitting} disabled={isSubmitting}>
                Submit & See Feedback
              </Button>
              <Button variant="ghost" onClick={handleReset}>
                Cancel
              </Button>
            </div>
          </div>
        )}

        {step === 'results' && result && (
          <div className="space-y-6">
            <div className="card p-8 text-center">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-neutral-100 mb-4">
                <span className={`text-3xl font-bold ${scoreColor}`}>{result.score}%</span>
              </div>
              <h2 className="text-lg font-semibold text-neutral-900">Your Score</h2>
              <p className="text-neutral-600">
                {result.correctCount} / {result.total} correct
              </p>
            </div>

            <div className="card p-6">
              <h3 className="text-base font-semibold text-neutral-900 mb-3">AI Feedback</h3>
              <p className="text-neutral-700 leading-relaxed whitespace-pre-line">{result.feedback}</p>
            </div>

            <div className="card p-6">
              <h3 className="text-base font-semibold text-neutral-900 mb-4">Question breakdown</h3>
              <ul className="space-y-4">
                {result.results.map((r, i) => (
                  <li key={i} className="border-b border-neutral-100 pb-4 last:border-0">
                    <p className="font-medium text-neutral-900 mb-1">{i + 1}. {r.question}</p>
                    <p className="text-sm">
                      Your answer: <span className={r.isCorrect ? 'text-green-600' : 'text-red-600'}>
                        {r.options[r.userSelected]}
                      </span>
                      {!r.isCorrect && (
                        <span className="text-neutral-600"> → Correct: {r.options[r.correctIndex]}</span>
                      )}
                    </p>
                  </li>
                ))}
              </ul>
            </div>

            <div className="flex gap-3">
              <Button onClick={handleReset}>Practice Again</Button>
              <Button variant="secondary" onClick={() => navigate('/dashboard')}>
                Back to Dashboard
              </Button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
