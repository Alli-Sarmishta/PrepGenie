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

function ScoreDisplay({ score }: { score: number }) {
  const ringColor = score >= 75 ? '#4ade80' : score >= 50 ? '#fcd34d' : '#f87171';
  const bgAlpha = score >= 75 ? 'rgba(74,222,128,.08)' : score >= 50 ? 'rgba(252,211,77,.08)' : 'rgba(248,113,113,.08)';
  const label = score >= 75 ? 'Excellent performance!' : score >= 50 ? 'Good effort — keep going!' : 'Keep practicing!';
  const SIZE = 120; const STROKE = 8;
  const R = (SIZE - STROKE) / 2; const CIRC = 2 * Math.PI * R;
  const offset = CIRC - (score / 100) * CIRC;

  return (
    <div className="card p-8 text-center" style={{ background: bgAlpha }}>
      <div className="flex flex-col items-center">
        <div className="relative inline-flex items-center justify-center mb-4">
          <svg width={SIZE} height={SIZE} className="-rotate-90">
            <circle cx={SIZE / 2} cy={SIZE / 2} r={R} fill="none" stroke="rgba(255,255,255,.06)" strokeWidth={STROKE} />
            <circle cx={SIZE / 2} cy={SIZE / 2} r={R} fill="none" stroke={ringColor} strokeWidth={STROKE}
              strokeLinecap="round" strokeDasharray={CIRC} strokeDashoffset={offset}
              style={{ transition: 'stroke-dashoffset 1s ease' }} />
          </svg>
          <div className="absolute flex flex-col items-center">
            <span className="text-4xl font-bold leading-none" style={{ color: 'var(--text-primary)' }}>{score}</span>
            <span className="text-xs font-semibold mt-0.5 uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>/ 100</span>
          </div>
        </div>
        <h2 className="text-base font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>Overall Score</h2>
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{label}</p>
      </div>
    </div>
  );
}

function FeedbackCard({ title, items, icon, accentBg, bulletColor, bullet }: {
  title: string; items: string[]; icon: React.ReactNode;
  accentBg: string; bulletColor: string; bullet: string;
}) {
  if (items.length === 0) return null;
  return (
    <div className="card p-6 h-full">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: accentBg }}>{icon}</div>
        <h3 className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>{title}</h3>
      </div>
      <ul className="space-y-2.5">
        {items.map((item, i) => (
          <li key={i} className="flex items-start gap-2.5 text-sm">
            <span className="font-bold flex-shrink-0 mt-0.5" style={{ color: bulletColor }}>{bullet}</span>
            <span className="leading-snug" style={{ color: 'var(--text-secondary)' }}>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function ResultsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [interview, setInterview] = useState<Interview | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => { fetchInterview(); }, [id]);

  const fetchInterview = async () => {
    try {
      const response = await interviewAPI.getById(id!);
      setInterview(response.data.interview);
    } catch (error) { console.error('Failed to fetch interview:', error); }
    finally { setIsLoading(false); }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg-page)' }}>
        <div className="text-center">
          <div className="inline-block w-10 h-10 border-2 rounded-full animate-spin" style={{ borderColor: 'var(--border)', borderTopColor: '#6366f1' }} />
          <p className="mt-4 text-sm font-medium" style={{ color: 'var(--text-tertiary)' }}>Loading results…</p>
        </div>
      </div>
    );
  }

  if (!interview || !interview.feedback) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'var(--bg-page)' }}>
        <div className="text-center max-w-sm">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: 'rgba(255,255,255,.04)' }}>
            <svg className="w-8 h-8" style={{ color: 'var(--text-muted)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>Feedback not available yet</p>
          <p className="text-sm mt-1 mb-4" style={{ color: 'var(--text-secondary)' }}>The interview may still be processing.</p>
          <Button onClick={() => navigate('/dashboard')}>Back to Dashboard</Button>
        </div>
      </div>
    );
  }

  const { feedback } = interview;

  return (
    <div className="min-h-screen bg-hero-mesh" style={{ background: 'var(--bg-page)' }}>
      <header className="page-header">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4 h-16">
            <button onClick={() => navigate('/dashboard')} className="inline-flex items-center gap-2 text-sm font-medium transition-colors hover:text-white" style={{ color: 'var(--text-secondary)' }}>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
              Dashboard
            </button>
            <div className="h-4 w-px" style={{ background: 'var(--border)' }} />
            <span className="text-sm" style={{ color: 'var(--text-tertiary)' }}>Results</span>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="mb-8 animate-fade-up">
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <span className="badge badge-brand">{interview.interviewType} Interview</span>
            <span style={{ color: 'var(--border)' }}>•</span>
            <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
              {new Date(interview.createdAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
            </span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>{interview.role}</h1>
          <p className="mt-1" style={{ color: 'var(--text-secondary)' }}>Here's a detailed breakdown of your performance</p>
        </div>

        <div className="mb-8 animate-fade-up" style={{ animationDelay: '80ms' }}>
          <ScoreDisplay score={feedback.score} />
        </div>

        <div className="card p-6 mb-8 animate-fade-up" style={{ animationDelay: '120ms' }}>
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
            <svg className="w-4 h-4 text-brand-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Summary
          </h3>
          <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{feedback.summary}</p>
        </div>

        <div className="grid md:grid-cols-3 gap-5 mb-10 animate-fade-up" style={{ animationDelay: '160ms' }}>
          <FeedbackCard title="Strengths" items={feedback.strengths}
            icon={<svg className="w-4 h-4 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
            accentBg="rgba(74,222,128,.1)" bulletColor="#4ade80" bullet="✓" />
          <FeedbackCard title="Areas to Improve" items={feedback.weaknesses}
            icon={<svg className="w-4 h-4 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>}
            accentBg="rgba(252,211,77,.1)" bulletColor="#fcd34d" bullet="!" />
          <FeedbackCard title="Next Steps" items={feedback.improvements}
            icon={<svg className="w-4 h-4 text-brand-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>}
            accentBg="rgba(99,102,241,.12)" bulletColor="#818cf8" bullet="→" />
        </div>

        <div className="flex flex-wrap gap-3 justify-center animate-fade-up" style={{ animationDelay: '200ms' }}>
          <Button size="lg" onClick={() => navigate('/interview/voice')}>Start New Interview</Button>
          <Button variant="secondary" size="lg" onClick={() => navigate('/dashboard')}>Back to Dashboard</Button>
        </div>
      </main>
    </div>
  );
}
