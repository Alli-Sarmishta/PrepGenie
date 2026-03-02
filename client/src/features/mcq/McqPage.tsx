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
    if (trimmed.length < 20) { setError('Please enter at least 20 characters.'); return; }
    setError(null); setIsGenerating(true);
    try {
      const res = await mcqAPI.generate({ jobDescription: trimmed, jobTitle: jobTitle.trim() || undefined });
      setSessionId(res.data.sessionId); setQuestions(res.data.questions);
      setAnswers(res.data.questions.map(() => -1)); setStep('quiz');
    } catch (err: unknown) {
      const msg = err && typeof err === 'object' && 'response' in err
        ? (err.response as { data?: { error?: string } })?.data?.error : null;
      setError(msg || 'Failed to generate questions. Please try again.');
    } finally { setIsGenerating(false); }
  };

  const setAnswer = (qIdx: number, oIdx: number) =>
    setAnswers((prev) => { const next = [...prev]; next[qIdx] = oIdx; return next; });

  const handleSubmit = async () => {
    if (!answers.every((a) => a >= 0)) { setError('Please answer all questions before submitting.'); return; }
    if (!sessionId) return;
    setError(null); setIsSubmitting(true);
    try {
      const res = await mcqAPI.submit({ sessionId, answers });
      setResult(res.data); setStep('results');
    } catch (err: unknown) {
      const msg = err && typeof err === 'object' && 'response' in err
        ? (err.response as { data?: { error?: string } })?.data?.error : null;
      setError(msg || 'Failed to submit. Please try again.');
    } finally { setIsSubmitting(false); }
  };

  const handleReset = () => { setStep('form'); setSessionId(null); setQuestions([]); setAnswers([]); setResult(null); setError(null); };
  const answeredCount = answers.filter((a) => a >= 0).length;
  const scoreColor = result ? result.score >= 70 ? '#4ade80' : result.score >= 50 ? '#fcd34d' : '#f87171' : '';
  const scoreBg = result ? result.score >= 70 ? 'rgba(74,222,128,.1)' : result.score >= 50 ? 'rgba(252,211,77,.1)' : 'rgba(248,113,113,.1)' : '';

  /* shared dark input style */
  const darkInput: React.CSSProperties = {
    width: '100%', padding: '.625rem .875rem', fontFamily: 'Poppins, sans-serif', fontSize: '.875rem',
    background: 'var(--bg-input)', border: '1.5px solid var(--border)', borderRadius: '10px',
    color: 'var(--text-primary)', outline: 'none', transition: 'border-color .2s, box-shadow .2s',
  };

  return (
    <div className="min-h-screen bg-hero-mesh" style={{ background: 'var(--bg-page)' }}>
      <header className="page-header">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <button onClick={() => step === 'form' ? navigate('/dashboard') : handleReset()} className="inline-flex items-center gap-2 text-sm font-medium transition-colors hover:text-white" style={{ color: 'var(--text-secondary)' }}>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                {step === 'form' ? 'Dashboard' : 'Start Over'}
              </button>
              <div className="h-4 w-px" style={{ background: 'var(--border)' }} />
              <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>MCQ Practice</span>
            </div>
            {step === 'quiz' && (
              <span className="text-xs font-semibold px-3 py-1.5 rounded-full" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>
                {answeredCount}/{questions.length} answered
              </span>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="mb-8 animate-fade-up">
          <p className="section-label mb-2">Practice</p>
          <h1 className="text-3xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>MCQ Quiz</h1>
          <p className="mt-1" style={{ color: 'var(--text-secondary)' }}>AI-generated questions — aptitude + job-specific — with expert feedback.</p>
        </div>

        {/* FORM */}
        {step === 'form' && (
          <div className="card p-7 animate-fade-up" style={{ animationDelay: '80ms' }}>
            <div className="space-y-5">
              <div>
                <label htmlFor="mcq-job-title" className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                  Job Title <span style={{ color: 'var(--text-muted)' }}>(optional)</span>
                </label>
                <input id="mcq-job-title" type="text" value={jobTitle}
                  onChange={(e) => setJobTitle(e.target.value)}
                  placeholder="e.g. Frontend Developer"
                  style={darkInput}
                  onFocus={(e) => { e.target.style.borderColor = '#6366f1'; e.target.style.boxShadow = '0 0 0 3px rgba(99,102,241,.18)'; }}
                  onBlur={(e) => { e.target.style.borderColor = 'var(--border)'; e.target.style.boxShadow = 'none'; }}
                />
              </div>
              <div>
                <label htmlFor="mcq-job-desc" className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                  Job Description <span style={{ color: '#f87171' }}>*</span>
                </label>
                <textarea id="mcq-job-desc" value={jobDescription}
                  onChange={(e) => setJobDescription(e.target.value)}
                  placeholder="Paste the job description here. We'll generate 5 aptitude + 5 job-related MCQs."
                  rows={6}
                  style={{ ...darkInput, resize: 'vertical' }}
                  onFocus={(e) => { e.target.style.borderColor = '#6366f1'; e.target.style.boxShadow = '0 0 0 3px rgba(99,102,241,.18)'; }}
                  onBlur={(e) => { e.target.style.borderColor = 'var(--border)'; e.target.style.boxShadow = 'none'; }}
                />
                <p className="mt-1.5 text-xs" style={{ color: 'var(--text-muted)' }}>{jobDescription.trim().length} / 20+ characters required</p>
              </div>

              {error && (
                <div className="flex items-start gap-3 px-4 py-3 rounded-xl text-sm" style={{ background: 'rgba(239,68,68,.1)', border: '1px solid rgba(239,68,68,.25)', color: '#f87171' }}>
                  <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-5a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0v-4.5A.75.75 0 0110 5zm0 10a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" /></svg>
                  {error}
                </div>
              )}

              <Button onClick={handleGenerate} isLoading={isGenerating} disabled={isGenerating} size="lg">
                {isGenerating ? 'Generating…' : 'Generate 10 Questions'}
              </Button>
            </div>
          </div>
        )}

        {/* QUIZ */}
        {step === 'quiz' && (
          <div className="space-y-5 animate-fade-up">
            {/* Progress bar */}
            <div className="card p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Your Progress</span>
                <span className="text-sm font-bold text-brand-400">{answeredCount}/{questions.length}</span>
              </div>
              <div className="flex gap-1">
                {questions.map((_, i) => (
                  <div key={i} className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${answers[i] >= 0 ? 'bg-gradient-to-r from-brand-500 to-violet-500' : ''}`}
                    style={answers[i] >= 0 ? {} : { background: 'rgba(255,255,255,.08)' }} />
                ))}
              </div>
            </div>

            {questions.map((q, qIdx) => (
              <div key={qIdx} className="card p-6 animate-fade-up" style={{ animationDelay: `${qIdx * 30}ms` }}>
                <div className="flex items-start gap-3 mb-4">
                  <span className="flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold text-brand-400" style={{ background: 'rgba(99,102,241,.15)' }}>
                    {qIdx + 1}
                  </span>
                  <p className="font-semibold text-sm leading-relaxed" style={{ color: 'var(--text-primary)' }}>{q.question}</p>
                </div>

                <div className="space-y-2 ml-10">
                  {q.options.map((opt, oIdx) => (
                    <label key={oIdx} className="flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all duration-150 text-sm"
                      style={answers[qIdx] === oIdx
                        ? { background: 'rgba(99,102,241,.12)', border: '1px solid rgba(99,102,241,.35)', color: '#c7d2fe' }
                        : { background: 'transparent', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
                      onMouseEnter={(e) => { if (answers[qIdx] !== oIdx) e.currentTarget.style.borderColor = 'rgba(99,102,241,.25)'; }}
                      onMouseLeave={(e) => { if (answers[qIdx] !== oIdx) e.currentTarget.style.borderColor = 'var(--border)'; }}
                    >
                      <div className="w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors"
                        style={answers[qIdx] === oIdx ? { borderColor: '#6366f1', background: '#6366f1' } : { borderColor: 'var(--border)' }}>
                        {answers[qIdx] === oIdx && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                      </div>
                      <input type="radio" name={`q-${qIdx}`} checked={answers[qIdx] === oIdx} onChange={() => setAnswer(qIdx, oIdx)} className="sr-only" />
                      <span>{opt}</span>
                    </label>
                  ))}
                </div>
              </div>
            ))}

            {error && <p className="text-sm font-medium" style={{ color: '#f87171' }}>{error}</p>}
            <div className="flex gap-3 pt-2">
              <Button onClick={handleSubmit} isLoading={isSubmitting} disabled={isSubmitting} size="lg">Submit & See Feedback</Button>
              <Button variant="ghost" onClick={handleReset}>Cancel</Button>
            </div>
          </div>
        )}

        {/* RESULTS */}
        {step === 'results' && result && (
          <div className="space-y-6 animate-fade-up">
            <div className="card p-8 text-center" style={{ background: scoreBg }}>
              <div className="inline-flex items-center justify-center w-24 h-24 rounded-full mb-4" style={{ background: scoreBg }}>
                <span className="text-4xl font-bold" style={{ color: scoreColor }}>{result.score}%</span>
              </div>
              <h2 className="text-lg font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>Your Score</h2>
              <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>{result.correctCount} of {result.total} correct</p>
              <div className="mt-4 max-w-xs mx-auto h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,.06)' }}>
                <div className="h-full rounded-full transition-all duration-700" style={{ width: `${result.score}%`, background: scoreColor }} />
              </div>
            </div>

            <div className="card p-6">
              <h3 className="text-sm font-semibold mb-3 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                <span className="w-5 h-5 rounded-md flex items-center justify-center" style={{ background: 'rgba(99,102,241,.15)' }}>
                  <svg className="w-3 h-3 text-brand-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                </span>
                AI Feedback
              </h3>
              <p className="text-sm leading-relaxed whitespace-pre-line" style={{ color: 'var(--text-secondary)' }}>{result.feedback}</p>
            </div>

            <div className="card p-6">
              <h3 className="text-sm font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Question Breakdown</h3>
              <ul className="space-y-4">
                {result.results.map((r, i) => (
                  <li key={i} style={{ borderBottom: '1px solid var(--border)', paddingBottom: '1rem' }} className="last:border-0 last:pb-0">
                    <p className="font-medium text-sm mb-2 flex items-start gap-2" style={{ color: 'var(--text-primary)' }}>
                      <span className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold mt-0.5"
                        style={r.isCorrect ? { background: 'rgba(74,222,128,.15)', color: '#4ade80' } : { background: 'rgba(248,113,113,.15)', color: '#f87171' }}>
                        {r.isCorrect ? '✓' : '✗'}
                      </span>
                      {i + 1}. {r.question}
                    </p>
                    <div className="ml-7 text-xs space-y-1">
                      <p>
                        <span className="font-medium" style={{ color: 'var(--text-tertiary)' }}>Your answer: </span>
                        <span className="font-semibold" style={{ color: r.isCorrect ? '#4ade80' : '#f87171' }}>{r.options[r.userSelected]}</span>
                      </p>
                      {!r.isCorrect && (
                        <p>
                          <span className="font-medium" style={{ color: 'var(--text-tertiary)' }}>Correct: </span>
                          <span className="font-semibold" style={{ color: '#4ade80' }}>{r.options[r.correctIndex]}</span>
                        </p>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            <div className="flex flex-wrap gap-3">
              <Button onClick={handleReset} size="lg">Practice Again</Button>
              <Button variant="secondary" size="lg" onClick={() => navigate('/dashboard')}>Back to Dashboard</Button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
