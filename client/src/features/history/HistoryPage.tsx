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
  feedback?: {
    score: number;
  };
}

export default function HistoryPage() {
  const navigate = useNavigate();
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'completed' | 'in_progress'>('all');

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

  const filteredInterviews = interviews.filter((interview) => {
    if (filter === 'all') return true;
    return interview.status === filter;
  });

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
            <h1 className="text-lg font-semibold text-neutral-900">Interview History</h1>
            <Button variant="ghost" size="sm" onClick={() => navigate('/dashboard')}>
              Dashboard
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Filters */}
        <div className="card p-1 mb-6 inline-flex gap-1">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              filter === 'all'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-neutral-700 hover:bg-neutral-100'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setFilter('completed')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              filter === 'completed'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-neutral-700 hover:bg-neutral-100'
            }`}
          >
            Completed
          </button>
          <button
            onClick={() => setFilter('in_progress')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              filter === 'in_progress'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-neutral-700 hover:bg-neutral-100'
            }`}
          >
            In Progress
          </button>
        </div>

        {/* Interview List */}
        <div className="card p-6">
          {isLoading ? (
            <div className="text-center py-16">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-2 border-neutral-200 border-t-blue-600"></div>
              <p className="mt-3 text-sm text-neutral-600">Loading history...</p>
            </div>
          ) : filteredInterviews.length === 0 ? (
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
              <p className="text-neutral-900 font-medium">No interviews found</p>
              <p className="text-sm text-neutral-500 mt-1">Try adjusting your filters</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredInterviews.map((interview) => (
                <div
                  key={interview.id}
                  onClick={() => {
                    if (interview.status === 'completed') {
                      navigate(`/results/${interview.id}`);
                    } else {
                      navigate(`/interview/${interview.id}`);
                    }
                  }}
                  className="card-hover p-4 cursor-pointer group"
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
                          hour: '2-digit',
                          minute: '2-digit',
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
        </div>
      </main>
    </div>
  );
}
