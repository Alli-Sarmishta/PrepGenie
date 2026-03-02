import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { interviewAPI } from '../../lib/api';
import Button from '../../components/Button';
import AIroboDarkImage from '../../assets/AIroboDark.jpg';

interface Interview {
  id: string;
  role: string;
  interviewType: string;
  status: string;
  createdAt: string;
  feedback?: { score: number };
}

/* ─── Nav Header ──────────────────────────────────────────────── */
function NavHeader({ onLogout, userName }: { onLogout: () => void; userName?: string }) {
  return (
    <header className="page-header">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-600 to-violet-600 flex items-center justify-center shadow-glow-sm">
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <span className="text-base font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>PrepGenie</span>
          </div>

          <div className="flex items-center gap-4">
            {userName && (
              <div className="hidden sm:flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-brand-500 to-violet-600 flex items-center justify-center">
                  <span className="text-xs font-bold text-white">{userName.charAt(0).toUpperCase()}</span>
                </div>
                <span className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>{userName}</span>
              </div>
            )}
            <Button variant="ghost" size="sm" onClick={onLogout}>Sign out</Button>
          </div>
        </div>
      </div>
    </header>
  );
}

/* ─── Action Card ─────────────────────────────────────────────── */
interface ActionCardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  iconBg: string;
  accentColor: string;
  buttonLabel: string;
  buttonVariant?: 'primary' | 'secondary';
  onClick: () => void;
  onButtonClick: (e: React.MouseEvent) => void;
  colSpan?: string;
}

function ActionCard({
  title, description, icon, iconBg, accentColor,
  buttonLabel, buttonVariant = 'secondary',
  onClick, onButtonClick, colSpan = '',
}: ActionCardProps) {
  return (
    <div
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onClick()}
      className={`group relative overflow-hidden card-hover p-6 sm:p-7 ${colSpan}`}
    >
      {/* Accent top border */}
      <div
        className="absolute top-0 left-0 right-0 h-0.5 opacity-70"
        style={{ background: `linear-gradient(90deg, ${accentColor}, transparent)` }}
      />

      <div
        className="w-11 h-11 rounded-xl flex items-center justify-center mb-4 shadow-sm"
        style={{ background: iconBg }}
      >
        {icon}
      </div>

      <h3 className="text-base font-semibold mb-1.5" style={{ color: 'var(--text-primary)' }}>{title}</h3>
      <p className="text-sm leading-relaxed mb-5" style={{ color: 'var(--text-secondary)' }}>{description}</p>

      <Button variant={buttonVariant} size="sm" onClick={onButtonClick}>
        {buttonLabel}
      </Button>
    </div>
  );
}

/* ─── Status badge ────────────────────────────────────────────── */
function StatusBadge({ status }: { status: string }) {
  if (status === 'completed') return <span className="badge badge-green">Completed</span>;
  if (status === 'in_progress') return <span className="badge badge-blue">In Progress</span>;
  return <span className="badge badge-slate">{status}</span>;
}

/* ─── Score chip ──────────────────────────────────────────────── */
function ScoreChip({ score }: { score: number }) {
  const color = score >= 75 ? '#4ade80' : score >= 50 ? '#fcd34d' : '#f87171';
  const bg = score >= 75 ? 'rgba(74,222,128,.1)' : score >= 50 ? 'rgba(252,211,77,.1)' : 'rgba(248,113,113,.1)';
  return (
    <div className="flex flex-col items-end px-3 py-1.5 rounded-xl" style={{ background: bg }}>
      <span className="text-xl font-bold leading-none" style={{ color }}>{score}</span>
      <span className="text-[10px] font-medium mt-0.5 uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>Score</span>
    </div>
  );
}

/* ─── Dashboard Page ─────────────────────────────────────────── */
export default function DashboardPage() {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => { fetchInterviews(); }, []);

  const fetchInterviews = async () => {
    try {
      const response = await interviewAPI.getAll();
      setInterviews(response.data.interviews);
    } catch (error) {
      console.error('Failed to fetch interviews:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => { logout(); navigate('/login'); };

  return (
    <div className="min-h-screen bg-hero-mesh" style={{ background: 'var(--bg-page)' }}>
      <NavHeader onLogout={handleLogout} userName={user?.name} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-12">

        {/* Welcome */}
        <div className="mb-10 animate-fade-up">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div>
              <p className="section-label mb-2">Dashboard</p>
              <h2 className="text-3xl sm:text-4xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
                Welcome back,{' '}
                <span className="text-gradient">{user?.name?.split(' ')[0] ?? 'there'}</span> 👋
              </h2>
              <p className="mt-2 text-base" style={{ color: 'var(--text-secondary)' }}>
                Ready to sharpen your interview skills? Pick an activity below.
              </p>
            </div>

            <div className="flex justify-end md:justify-center">
              <img
                src={AIroboDarkImage}
                alt="AI interview assistant"
                className="h-24 sm:h-28 md:h-32 w-auto object-contain rounded-xl"
              />
            </div>
          </div>
        </div>

        {/* Quick actions */}
        <p className="section-label mb-4">Quick actions</p>
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-5 mb-12 animate-fade-up" style={{ animationDelay: '80ms' }}>
          <ActionCard
            title="Voice Interview"
            description="Practice with an AI interviewer using voice. Receive instant feedback on your performance."
            icon={<svg className="w-5 h-5 text-brand-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>}
            iconBg="rgba(99,102,241,.15)"
            accentColor="#6366f1"
            buttonLabel="Start Interview"
            buttonVariant="primary"
            onClick={() => navigate('/interview/voice')}
            onButtonClick={(e) => { e.stopPropagation(); navigate('/interview/voice'); }}
          />
          <ActionCard
            title="Resume Analyzer"
            description="Upload your resume for AI-powered feedback, ATS optimization tips, and tailored suggestions."
            icon={<svg className="w-5 h-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>}
            iconBg="rgba(52,211,153,.12)"
            accentColor="#34d399"
            buttonLabel="Analyze Resume"
            onClick={() => navigate('/resume')}
            onButtonClick={(e) => { e.stopPropagation(); navigate('/resume'); }}
          />
          <ActionCard
            title="MCQ Practice"
            description="10 AI-generated questions — aptitude + job-specific — with expert feedback and explanations."
            icon={<svg className="w-5 h-5 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>}
            iconBg="rgba(139,92,246,.15)"
            accentColor="#8b5cf6"
            buttonLabel="Start MCQ Quiz"
            colSpan="md:col-span-2 xl:col-span-1"
            onClick={() => navigate('/mcq')}
            onButtonClick={(e) => { e.stopPropagation(); navigate('/mcq'); }}
          />
        </div>

        {/* Recent interviews */}
        <section aria-label="Recent interviews" className="animate-fade-up" style={{ animationDelay: '160ms' }}>
          <div className="flex items-center justify-between mb-4">
            <p className="section-label">Recent interviews</p>
            {interviews.length > 0 && (
              <button
                className="text-xs font-semibold transition-colors text-brand-400 hover:text-brand-300"
                onClick={() => navigate('/history')}
              >
                View all →
              </button>
            )}
          </div>

          <div className="card overflow-hidden">
            {isLoading ? (
              <div className="text-center py-16">
                <div className="inline-block w-9 h-9 border-2 border-t-brand-500 rounded-full animate-spin" style={{ borderColor: 'var(--border)', borderTopColor: '#6366f1' }} />
                <p className="mt-3 text-sm font-medium" style={{ color: 'var(--text-tertiary)' }}>Loading your interviews…</p>
              </div>
            ) : interviews.length === 0 ? (
              <div className="text-center py-16 px-6">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4" style={{ background: 'rgba(255,255,255,.04)' }}>
                  <svg className="w-8 h-8" style={{ color: 'var(--text-muted)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <p className="font-semibold text-base" style={{ color: 'var(--text-primary)' }}>No interviews yet</p>
                <p className="text-sm mt-1 mb-5" style={{ color: 'var(--text-tertiary)' }}>Start your first interview to see results here.</p>
                <Button onClick={() => navigate('/interview/voice')} size="sm">Start First Interview</Button>
              </div>
            ) : (
              <ul role="list" className="divide-y" style={{ borderColor: 'var(--border)' }}>
                {interviews.slice(0, 6).map((interview) => (
                  <li key={interview.id}>
                    <div
                      onClick={() => {
                        if (interview.status === 'completed') navigate(`/results/${interview.id}`);
                        else navigate(`/interview/${interview.id}`);
                      }}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          if (interview.status === 'completed') navigate(`/results/${interview.id}`);
                          else navigate(`/interview/${interview.id}`);
                        }
                      }}
                      className="flex justify-between items-center px-6 py-4 cursor-pointer transition-colors group"
                      style={{ '--hover-bg': 'var(--bg-card-hover)' } as any}
                      onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-card-hover)')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                    >
                      <div className="flex items-center gap-4 min-w-0">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(99,102,241,.12)', border: '1px solid rgba(99,102,241,.2)' }}>
                          <svg className="w-5 h-5 text-brand-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                          </svg>
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-sm truncate" style={{ color: 'var(--text-primary)' }}>{interview.role}</span>
                            <StatusBadge status={interview.status} />
                          </div>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{interview.interviewType} Interview</span>
                            <span style={{ color: 'var(--border)' }}>•</span>
                            <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                              {new Date(interview.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 ml-4">
                        {interview.feedback && <ScoreChip score={interview.feedback.score} />}
                        <svg className="w-4 h-4 transition-colors" style={{ color: 'var(--text-muted)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
