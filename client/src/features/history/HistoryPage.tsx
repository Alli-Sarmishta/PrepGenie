import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { interviewAPI } from '../../lib/api';
import Button from '../../components/Button';

interface Interview {
  id: string;
  role: string;
  interviewType: string;
  status: string;
  createdAt: string;
  feedback?: { score: number };
}

type FilterType = 'all' | 'completed' | 'in_progress';

function StatusBadge({ status }: { status: string }) {
  if (status === 'completed') return <span className="badge badge-green">Completed</span>;
  if (status === 'in_progress') return <span className="badge badge-blue">In Progress</span>;
  return <span className="badge badge-slate">{status}</span>;
}

export default function HistoryPage() {
  const navigate = useNavigate();
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<FilterType>('all');

  useEffect(() => { fetchInterviews(); }, []);

  const fetchInterviews = async () => {
    try {
      const response = await interviewAPI.getAll();
      setInterviews(response.data.interviews);
    } catch (error) { console.error('Failed to fetch:', error); }
    finally { setIsLoading(false); }
  };

  const filteredInterviews = interviews.filter((i) => filter === 'all' || i.status === filter);

  const filters: { label: string; value: FilterType; count: number }[] = [
    { label: 'All', value: 'all', count: interviews.length },
    { label: 'Completed', value: 'completed', count: interviews.filter((i) => i.status === 'completed').length },
    { label: 'In Progress', value: 'in_progress', count: interviews.filter((i) => i.status === 'in_progress').length },
  ];

  return (
    <div className="min-h-screen bg-hero-mesh" style={{ background: 'var(--bg-page)' }}>
      <header className="page-header">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <button onClick={() => navigate('/dashboard')} className="inline-flex items-center gap-2 text-sm font-medium transition-colors hover:text-white" style={{ color: 'var(--text-secondary)' }}>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                Dashboard
              </button>
              <div className="h-4 w-px" style={{ background: 'var(--border)' }} />
              <h1 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Interview History</h1>
            </div>
            <Button size="sm" onClick={() => navigate('/interview/voice')}>New Interview</Button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="mb-8 animate-fade-up">
          <p className="section-label mb-2">History</p>
          <h2 className="text-3xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>Your Interviews</h2>
          <p className="mt-1" style={{ color: 'var(--text-secondary)' }}>{interviews.length} total interview{interviews.length !== 1 ? 's' : ''}</p>
        </div>

        {/* Filter tabs */}
        <div className="mb-6 animate-fade-up" style={{ animationDelay: '60ms' }}>
          <div className="inline-flex items-center p-1 rounded-xl gap-1" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
            {filters.map((f) => (
              <button
                key={f.value}
                onClick={() => setFilter(f.value)}
                className={[
                  'flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-semibold transition-all duration-200',
                  filter === f.value ? 'text-white' : 'hover:text-white',
                ].join(' ')}
                style={filter === f.value
                  ? { background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)', boxShadow: '0 2px 8px rgba(99,102,241,.4)' }
                  : { color: 'var(--text-secondary)' }}
              >
                {f.label}
                <span
                  className="text-xs px-1.5 py-0.5 rounded-md font-bold"
                  style={filter === f.value
                    ? { background: 'rgba(255,255,255,.2)', color: 'rgba(255,255,255,.9)' }
                    : { background: 'rgba(255,255,255,.06)', color: 'var(--text-tertiary)' }}
                >
                  {f.count}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* List */}
        <div className="card overflow-hidden animate-fade-up" style={{ animationDelay: '120ms' }}>
          {isLoading ? (
            <div className="text-center py-16">
              <div className="inline-block w-9 h-9 border-2 rounded-full animate-spin" style={{ borderColor: 'var(--border)', borderTopColor: '#6366f1' }} />
              <p className="mt-3 text-sm font-medium" style={{ color: 'var(--text-tertiary)' }}>Loading history…</p>
            </div>
          ) : filteredInterviews.length === 0 ? (
            <div className="text-center py-16 px-6">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-4" style={{ background: 'rgba(255,255,255,.04)' }}>
                <svg className="w-7 h-7" style={{ color: 'var(--text-muted)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <p className="font-semibold text-base" style={{ color: 'var(--text-primary)' }}>No interviews found</p>
              <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
                {filter !== 'all' ? 'Try a different filter.' : 'Start your first AI mock interview.'}
              </p>
            </div>
          ) : (
            <ul role="list">
              {filteredInterviews.map((interview) => {
                const score = interview.feedback?.score;
                const scoreColor = score !== undefined ? score >= 75 ? '#4ade80' : score >= 50 ? '#fcd34d' : '#f87171' : undefined;
                const scoreBg = score !== undefined ? score >= 75 ? 'rgba(74,222,128,.1)' : score >= 50 ? 'rgba(252,211,77,.1)' : 'rgba(248,113,113,.1)' : undefined;

                return (
                  <li key={interview.id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <div
                      onClick={() => {
                        if (interview.status === 'completed') navigate(`/results/${interview.id}`);
                        else navigate(`/interview/${interview.id}`);
                      }}
                      role="button" tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          if (interview.status === 'completed') navigate(`/results/${interview.id}`);
                          else navigate(`/interview/${interview.id}`);
                        }
                      }}
                      className="flex justify-between items-center px-6 py-4 cursor-pointer transition-colors group"
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
                              {new Date(interview.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 ml-4">
                        {score !== undefined && (
                          <div className="flex flex-col items-end px-3 py-1.5 rounded-xl" style={{ background: scoreBg }}>
                            <span className="text-xl font-bold leading-none" style={{ color: scoreColor }}>{score}</span>
                            <span className="text-[10px] font-medium mt-0.5 uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>Score</span>
                          </div>
                        )}
                        <svg className="w-4 h-4" style={{ color: 'var(--text-muted)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </main>
    </div>
  );
}
