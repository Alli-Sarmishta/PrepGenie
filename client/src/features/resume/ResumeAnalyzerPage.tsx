import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { resumeAPI, type ResumeAnalysis } from '../../lib/api';
import Button from '../../components/Button';

// File validation constants (mirror backend)
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];

/** Loading skeleton for feedback sections */
function FeedbackSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-32 bg-neutral-100 rounded-xl" />
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="h-48 bg-neutral-100 rounded-xl" />
        ))}
      </div>
    </div>
  );
}

/** Feedback section card component */
function FeedbackCard({
  title,
  items,
  icon: Icon,
  iconBg,
  iconColor,
  bullet,
}: {
  title: string;
  items: string[];
  icon: React.ComponentType<{ className?: string }>;
  iconBg: string;
  iconColor: string;
  bullet: string;
}) {
  if (items.length === 0) return null;
  return (
    <div className="card p-6">
      <div className="flex items-center gap-2 mb-4">
        <div className={`w-8 h-8 ${iconBg} rounded-lg flex items-center justify-center`}>
          <Icon className={`w-4 h-4 ${iconColor}`} />
        </div>
        <h3 className="text-base font-semibold text-neutral-900">{title}</h3>
      </div>
      <ul className="space-y-2.5">
        {items.map((item, index) => (
          <li key={index} className="flex items-start gap-2 text-sm">
            <span className={`${iconColor} mt-0.5 flex-shrink-0`}>{bullet}</span>
            <span className="text-neutral-700">{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function ResumeAnalyzerPage() {
  const navigate = useNavigate();
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<ResumeAnalysis | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  const validateFile = useCallback((f: File): string | null => {
    if (!ALLOWED_TYPES.includes(f.type)) {
      return 'Invalid file type. Please upload a PDF or DOCX file.';
    }
    if (f.size > MAX_FILE_SIZE) {
      return 'File too large. Maximum size is 5MB.';
    }
    return null;
  }, []);

  const handleFileSelect = useCallback(
    (selectedFile: File | null) => {
      setError(null);
      setAnalysis(null);
      if (!selectedFile) {
        setFile(null);
        return;
      }
      const validationError = validateFile(selectedFile);
      if (validationError) {
        setError(validationError);
        setFile(null);
        return;
      }
      setFile(selectedFile);
    },
    [validateFile]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const f = e.dataTransfer.files[0];
      if (f) handleFileSelect(f);
    },
    [handleFileSelect]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleAnalyze = async () => {
    if (!file) return;
    setError(null);
    setAnalysis(null);
    setIsLoading(true);
    setUploadProgress(0);

    try {
      const response = await resumeAPI.analyze(file, (percent) => setUploadProgress(percent));
      setAnalysis(response.data.analysis);
      setFile(null);
    } catch (err: unknown) {
      const msg = err && typeof err === 'object' && 'response' in err
        ? (err.response as { data?: { error?: string } })?.data?.error
        : null;
      setError(msg || 'Failed to analyze resume. Please try again.');
    } finally {
      setIsLoading(false);
      setUploadProgress(0);
    }
  };

  const scoreColor = analysis
    ? analysis.score >= 75
      ? 'text-green-600'
      : analysis.score >= 50
        ? 'text-amber-600'
        : 'text-red-600'
    : '';
  const scoreBg = analysis
    ? analysis.score >= 75
      ? 'bg-green-50'
      : analysis.score >= 50
        ? 'bg-amber-50'
        : 'bg-red-50'
    : '';

  return (
    <div className="min-h-screen bg-neutral-50">
      {/* Header */}
      <header className="bg-white border-b border-neutral-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
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

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-neutral-900 tracking-tight">Resume Analyzer</h1>
          <p className="text-neutral-600 mt-1">
            Upload your resume to get AI-powered feedback and improvement suggestions
          </p>
        </div>

        {/* Upload Section */}
        <div className="card p-6 mb-8">
          <h2 className="text-lg font-semibold text-neutral-900 mb-4">Upload Resume</h2>
          <p className="text-sm text-neutral-600 mb-4">
            PDF or DOCX • Max 5MB • We extract text and analyze securely
          </p>

          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            className={`
              border-2 border-dashed rounded-xl p-8 text-center transition-colors
              ${isDragging ? 'border-blue-400 bg-blue-50/50' : 'border-neutral-300 hover:border-neutral-400'}
            `}
          >
            <input
              type="file"
              accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              className="hidden"
              id="resume-upload"
              onChange={(e) => handleFileSelect(e.target.files?.[0] ?? null)}
            />
            <label htmlFor="resume-upload" className="cursor-pointer block">
              <div className="w-12 h-12 mx-auto mb-3 bg-neutral-100 rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 text-neutral-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
              </div>
              <p className="text-neutral-700 font-medium">
                {file ? file.name : 'Drag and drop or click to browse'}
              </p>
              <p className="text-xs text-neutral-500 mt-1">
                {file ? `${(file.size / 1024).toFixed(1)} KB` : 'PDF or DOCX'}
              </p>
            </label>
          </div>

          {error && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {error}
            </div>
          )}

          {isLoading && (
            <div className="mt-4">
              <div className="flex items-center justify-between text-sm text-neutral-600 mb-2">
                <span>Uploading and analyzing...</span>
                {uploadProgress < 100 && <span>{uploadProgress}%</span>}
              </div>
              <div className="h-2 bg-neutral-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-600 transition-all duration-300"
                  style={{ width: uploadProgress < 100 ? `${uploadProgress}%` : '100%' }}
                />
              </div>
            </div>
          )}

          <div className="mt-4 flex gap-3">
            <Button
              onClick={handleAnalyze}
              disabled={!file || isLoading}
              isLoading={isLoading}
            >
              Analyze Resume
            </Button>
            {file && !isLoading && (
              <Button variant="ghost" onClick={() => handleFileSelect(null)}>
                Clear
              </Button>
            )}
          </div>
        </div>

        {/* Results Section */}
        {isLoading && <FeedbackSkeleton />}

        {analysis && !isLoading && (
          <div className="space-y-6">
            {/* Score Card */}
            <div className={`card p-8 text-center ${scoreBg} border-2`}>
              <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-white shadow-sm mb-4">
                <span className={`text-4xl font-bold ${scoreColor}`}>{analysis.score}</span>
              </div>
              <h2 className="text-lg font-semibold text-neutral-900 mb-1">Overall Resume Score</h2>
              <p className="text-sm text-neutral-600">
                {analysis.score >= 75 ? 'Strong resume!' : analysis.score >= 50 ? 'Good foundation with room to improve' : 'Needs significant improvements'}
              </p>
            </div>

            {/* Feedback Grid */}
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              <FeedbackCard
                title="Strengths"
                items={analysis.strengths}
                icon={({ className }) => (
                  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                )}
                iconBg="bg-green-100"
                iconColor="text-green-600"
                bullet="✓"
              />
              <FeedbackCard
                title="Weak Areas"
                items={analysis.weaknesses}
                icon={({ className }) => (
                  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                )}
                iconBg="bg-amber-100"
                iconColor="text-amber-600"
                bullet="!"
              />
              <FeedbackCard
                title="Grammar & Clarity"
                items={analysis.grammarSuggestions}
                icon={({ className }) => (
                  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                )}
                iconBg="bg-blue-100"
                iconColor="text-blue-600"
                bullet="→"
              />
              <FeedbackCard
                title="ATS Optimization Tips"
                items={analysis.atsTips}
                icon={({ className }) => (
                  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                )}
                iconBg="bg-indigo-100"
                iconColor="text-indigo-600"
                bullet="•"
              />
              <FeedbackCard
                title="Suggested Improvements"
                items={analysis.improvements}
                icon={({ className }) => (
                  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                )}
                iconBg="bg-violet-100"
                iconColor="text-violet-600"
                bullet="→"
              />
            </div>

            <div className="flex justify-center pt-4">
              <Button variant="secondary" onClick={() => setAnalysis(null)}>
                Analyze Another Resume
              </Button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
