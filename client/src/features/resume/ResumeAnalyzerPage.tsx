import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { resumeAPI, type ResumeAnalysis } from '../../lib/api';
import Button from '../../components/Button';

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ALLOWED_TYPES = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];

function FeedbackCard({ title, items, icon, accentBg, bulletColor, bullet }: {
  title: string; items: string[]; icon: React.ReactNode;
  accentBg: string; bulletColor: string; bullet: string;
}) {
  if (items.length === 0) return null;
  return (
    <div className="card p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: accentBg }}>{icon}</div>
        <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{title}</h3>
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

function ScoreDisplay({ score }: { score: number }) {
  const SIZE = 108; const STROKE = 7;
  const R = (SIZE - STROKE) / 2; const CIRC = 2 * Math.PI * R;
  const offset = CIRC - (score / 100) * CIRC;
  const ringColor = score >= 75 ? '#4ade80' : score >= 50 ? '#fcd34d' : '#f87171';
  const bg = score >= 75 ? 'rgba(74,222,128,.06)' : score >= 50 ? 'rgba(252,211,77,.06)' : 'rgba(248,113,113,.06)';
  const label = score >= 75 ? 'Strong resume!' : score >= 50 ? 'Good — room to grow' : 'Needs improvements';
  return (
    <div className="card p-8 text-center" style={{ background: bg }}>
      <div className="flex flex-col items-center">
        <div className="relative inline-flex items-center justify-center mb-3">
          <svg width={SIZE} height={SIZE} className="-rotate-90">
            <circle cx={SIZE / 2} cy={SIZE / 2} r={R} fill="none" stroke="rgba(255,255,255,.06)" strokeWidth={STROKE} />
            <circle cx={SIZE / 2} cy={SIZE / 2} r={R} fill="none" stroke={ringColor} strokeWidth={STROKE} strokeLinecap="round"
              strokeDasharray={CIRC} strokeDashoffset={offset} style={{ transition: 'stroke-dashoffset 1s ease' }} />
          </svg>
          <div className="absolute flex flex-col items-center">
            <span className="text-3xl font-bold leading-none" style={{ color: 'var(--text-primary)' }}>{score}</span>
            <span className="text-[10px] font-semibold mt-0.5" style={{ color: 'var(--text-muted)' }}>/ 100</span>
          </div>
        </div>
        <h2 className="text-base font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>Resume Score</h2>
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{label}</p>
      </div>
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
    if (!ALLOWED_TYPES.includes(f.type)) return 'Invalid file type. Please upload a PDF or DOCX file.';
    if (f.size > MAX_FILE_SIZE) return 'File too large. Maximum size is 5 MB.';
    return null;
  }, []);

  const handleFileSelect = useCallback((selectedFile: File | null) => {
    setError(null); setAnalysis(null);
    if (!selectedFile) { setFile(null); return; }
    const err = validateFile(selectedFile);
    if (err) { setError(err); setFile(null); return; }
    setFile(selectedFile);
  }, [validateFile]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setIsDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFileSelect(f);
  }, [handleFileSelect]);

  const handleAnalyze = async () => {
    if (!file) return;
    setError(null); setAnalysis(null); setIsLoading(true); setUploadProgress(0);
    try {
      const response = await resumeAPI.analyze(file, (pct) => setUploadProgress(pct));
      setAnalysis(response.data.analysis); setFile(null);
    } catch (err: unknown) {
      const msg = err && typeof err === 'object' && 'response' in err
        ? (err.response as { data?: { error?: string } })?.data?.error : null;
      setError(msg || 'Failed to analyze resume. Please try again.');
    } finally { setIsLoading(false); setUploadProgress(0); }
  };

  return (
    <div className="min-h-screen bg-hero-mesh" style={{ background: 'var(--bg-page)' }}>
      <header className="page-header">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3 h-16">
            <button onClick={() => navigate('/dashboard')} className="inline-flex items-center gap-2 text-sm font-medium transition-colors hover:text-white" style={{ color: 'var(--text-secondary)' }}>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
              Dashboard
            </button>
            <div className="h-4 w-px" style={{ background: 'var(--border)' }} />
            <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Resume Analyzer</span>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="mb-8 animate-fade-up">
          <p className="section-label mb-2">AI Tool</p>
          <h1 className="text-3xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>Resume Analyzer</h1>
          <p className="mt-1" style={{ color: 'var(--text-secondary)' }}>Upload your resume for AI-powered feedback and ATS optimization tips.</p>
        </div>

        {!analysis && (
          <div className="card p-7 mb-8 animate-fade-up" style={{ animationDelay: '80ms' }}>
            <h2 className="text-base font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>Upload your resume</h2>
            <p className="text-xs mb-5" style={{ color: 'var(--text-tertiary)' }}>PDF or DOCX &nbsp;•&nbsp; Max 5 MB</p>

            {/* Drop zone */}
            <div
              onDrop={handleDrop}
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              className="relative border-2 border-dashed rounded-2xl p-10 text-center transition-all duration-200 cursor-pointer"
              style={{
                borderColor: isDragging ? '#6366f1' : file ? '#4ade80' : 'var(--border-hover)',
                background: isDragging ? 'rgba(99,102,241,.06)' : file ? 'rgba(74,222,128,.04)' : 'transparent',
              }}
            >
              <input
                type="file"
                accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                id="resume-upload"
                onChange={(e) => handleFileSelect(e.target.files?.[0] ?? null)}
                aria-label="Upload resume file"
              />
              <div className="mx-auto w-14 h-14 rounded-2xl flex items-center justify-center mb-4" style={{ background: file ? 'rgba(74,222,128,.1)' : 'rgba(255,255,255,.05)' }}>
                {file ? (
                  <svg className="w-7 h-7 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                ) : (
                  <svg className="w-7 h-7" style={{ color: 'var(--text-muted)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
                )}
              </div>
              <p className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
                {file ? file.name : isDragging ? 'Drop here!' : 'Drag & drop or click to browse'}
              </p>
              <p className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>
                {file ? `${(file.size / 1024).toFixed(1)} KB` : 'PDF or DOCX accepted'}
              </p>
            </div>

            {error && (
              <div className="mt-4 flex items-start gap-3 px-4 py-3 rounded-xl text-sm" style={{ background: 'rgba(239,68,68,.1)', border: '1px solid rgba(239,68,68,.25)', color: '#f87171' }}>
                <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-5a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0v-4.5A.75.75 0 0110 5zm0 10a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" /></svg>
                {error}
              </div>
            )}

            {isLoading && (
              <div className="mt-5">
                <div className="flex items-center justify-between text-xs font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
                  <span>Analyzing…</span>
                  {uploadProgress < 100 && <span>{uploadProgress}%</span>}
                </div>
                <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,.06)' }}>
                  <div className="h-full bg-gradient-to-r from-brand-500 to-violet-500 transition-all duration-300 rounded-full" style={{ width: uploadProgress < 100 ? `${uploadProgress}%` : '100%' }} />
                </div>
              </div>
            )}

            <div className="mt-6 flex items-center gap-3">
              <Button onClick={handleAnalyze} disabled={!file || isLoading} isLoading={isLoading}>Analyze Resume</Button>
              {file && !isLoading && <Button variant="ghost" onClick={() => handleFileSelect(null)}>Clear</Button>}
            </div>
          </div>
        )}

        {analysis && !isLoading && (
          <div className="space-y-6 animate-fade-up">
            <ScoreDisplay score={analysis.score} />
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              <FeedbackCard title="Strengths" items={analysis.strengths}
                icon={<svg className="w-4 h-4 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
                accentBg="rgba(74,222,128,.1)" bulletColor="#4ade80" bullet="✓" />
              <FeedbackCard title="Weak Areas" items={analysis.weaknesses}
                icon={<svg className="w-4 h-4 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>}
                accentBg="rgba(252,211,77,.1)" bulletColor="#fcd34d" bullet="!" />
              <FeedbackCard title="Grammar & Clarity" items={analysis.grammarSuggestions}
                icon={<svg className="w-4 h-4 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>}
                accentBg="rgba(96,165,250,.1)" bulletColor="#60a5fa" bullet="→" />
              <FeedbackCard title="ATS Optimization" items={analysis.atsTips}
                icon={<svg className="w-4 h-4 text-brand-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
                accentBg="rgba(99,102,241,.12)" bulletColor="#818cf8" bullet="•" />
              <FeedbackCard title="Improvements" items={analysis.improvements}
                icon={<svg className="w-4 h-4 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>}
                accentBg="rgba(139,92,246,.12)" bulletColor="#a78bfa" bullet="→" />
            </div>
            <div className="flex justify-center pt-2">
              <Button variant="secondary" onClick={() => setAnalysis(null)}>Analyze Another Resume</Button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
