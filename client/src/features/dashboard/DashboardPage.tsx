import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { interviewAPI } from '../../lib/api';
import Button from '../../components/Button';

interface Interview {
  id: string;
  role: string;
  interviewType: string;
  status: string;
  createdAt: string;
  feedback?: {
    score: number;
  };
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchInterviews();
  }, []);

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

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-700 border border-green-200';
      case 'in_progress':
        return 'bg-blue-100 text-blue-700 border border-blue-200';
      default:
        return 'bg-neutral-100 text-neutral-700 border border-neutral-200';
    }
  };

  return (
    <div className="min-h-screen bg-neutral-50">
      {/* Header */}
      <header className="bg-white border-b border-neutral-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <div>
                <h1 className="text-lg font-semibold text-neutral-900">PrepGenie</h1>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={handleLogout}>
              Sign out
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-12">
        {/* Welcome Section */}
        <div className="mb-10 sm:mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold text-neutral-900 tracking-tight">Welcome back, {user?.name}</h2>
          <p className="text-neutral-600 mt-2 text-base">Practice interviews and track your progress</p>
        </div>

        {/* Quick actions section label */}
        <h3 className="text-sm font-semibold text-neutral-500 uppercase tracking-wider mb-4">Quick actions</h3>
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6 sm:gap-8 mb-14">
          {/* Create Interview Card */}
          <div className="card p-6 sm:p-8 bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200/80">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-semibold text-neutral-900 mb-2">Voice Interview</h3>
                <p className="text-neutral-600 text-sm leading-relaxed mb-5">
                  Practice with AI using voice. Get instant feedback.
                </p>
                <Button onClick={() => navigate('/interview/voice')} size="lg">
                  <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                  </svg>
                  Start Interview
                </Button>
              </div>
              <div className="hidden sm:block flex-shrink-0">
                <div className="w-14 h-14 sm:w-16 sm:h-16 bg-blue-600/10 rounded-xl flex items-center justify-center">
                  <svg className="w-8 h-8 sm:w-9 sm:h-9 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                  </svg>
                </div>
              </div>
            </div>
          </div>

          {/* Resume Analyzer Card */}
          <div
            onClick={() => navigate('/resume')}
            className="card p-6 sm:p-8 bg-gradient-to-br from-emerald-50 to-teal-50 border-emerald-200/80 cursor-pointer card-hover"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-semibold text-neutral-900 mb-2">Resume Analyzer</h3>
                <p className="text-neutral-600 text-sm leading-relaxed mb-5">
                  Upload your resume for AI feedback and ATS tips.
                </p>
                <Button variant="secondary" size="lg" onClick={(e) => { e.stopPropagation(); navigate('/resume'); }}>
                  <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Analyze Resume
                </Button>
              </div>
              <div className="hidden sm:block flex-shrink-0">
                <div className="w-14 h-14 sm:w-16 sm:h-16 bg-emerald-600/10 rounded-xl flex items-center justify-center">
                  <svg className="w-8 h-8 sm:w-9 sm:h-9 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
              </div>
            </div>
          </div>

          {/* MCQ Practice Card */}
          <div
            onClick={() => navigate('/mcq')}
            className="card p-6 sm:p-8 bg-gradient-to-br from-violet-50 to-purple-50 border-violet-200/80 cursor-pointer card-hover md:col-span-2 xl:col-span-1"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-semibold text-neutral-900 mb-2">MCQ Practice</h3>
                <p className="text-neutral-600 text-sm leading-relaxed mb-5">
                  10 AI questions (aptitude + job-based) with feedback.
                </p>
                <Button variant="secondary" size="lg" onClick={(e) => { e.stopPropagation(); navigate('/mcq'); }}>
                  <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                  </svg>
                  Start MCQ Quiz
                </Button>
              </div>
              <div className="hidden sm:block flex-shrink-0">
                <div className="w-14 h-14 sm:w-16 sm:h-16 bg-violet-600/10 rounded-xl flex items-center justify-center">
                  <svg className="w-8 h-8 sm:w-9 sm:h-9 text-violet-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Past Interviews */}
        <section className="card p-6 sm:p-8" aria-label="Recent interviews">
          <div className="flex items-center justify-between mb-6 sm:mb-8">
            <h2 className="text-lg font-semibold text-neutral-900">Recent interviews</h2>
            {interviews.length > 0 && (
              <button className="text-sm text-blue-600 hover:text-blue-700 font-medium">
                View all
              </button>
            )}
          </div>

          {isLoading ? (
            <div className="text-center py-16">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-2 border-neutral-200 border-t-blue-600"></div>
              <p className="mt-3 text-sm text-neutral-600">Loading interviews...</p>
            </div>
          ) : interviews.length === 0 ? (
            <div className="text-center py-16">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-neutral-100 rounded-2xl mb-4">
                <svg
                  className="w-8 h-8 text-neutral-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
              </div>
              <p className="text-neutral-900 font-medium">No interviews yet</p>
              <p className="text-sm text-neutral-500 mt-1">Start your first interview to see it here</p>
            </div>
          ) : (
            <div className="space-y-2 sm:space-y-3">
              {interviews.map((interview) => (
                <div
                  key={interview.id}
                  onClick={() => {
                    if (interview.status === 'completed') {
                      navigate(`/results/${interview.id}`);
                    } else {
                      navigate(`/interview/${interview.id}`);
                    }
                  }}
                  className="card-hover p-4 sm:p-5 rounded-lg cursor-pointer group"
                >
                  <div className="flex justify-between items-start gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-medium text-neutral-900 truncate">
                          {interview.role}
                        </h3>
                        <span
                          className={`px-2 py-0.5 rounded-md text-xs font-medium ${getStatusColor(
                            interview.status
                          )}`}
                        >
                          {interview.status === 'completed' ? 'Completed' : 'In Progress'}
                        </span>
                      </div>
                      <p className="text-sm text-neutral-600">
                        {interview.interviewType} Interview
                      </p>
                      <p className="text-xs text-neutral-500 mt-2">
                        {new Date(interview.createdAt).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      {interview.feedback && (
                        <div className="text-right">
                          <div className="text-2xl font-bold text-blue-600">
                            {interview.feedback.score}
                          </div>
                          <div className="text-xs text-neutral-500">Score</div>
                        </div>
                      )}
                      <svg className="w-5 h-5 text-neutral-400 group-hover:text-neutral-600 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
