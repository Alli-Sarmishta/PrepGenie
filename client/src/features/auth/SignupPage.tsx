import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { authAPI } from '../../lib/api';
import Input from '../../components/Input';
import Button from '../../components/Button';

const PASSWORD_MIN_LENGTH = 6;

function validatePassword(password: string): { valid: boolean; message?: string } {
  if (password.length < PASSWORD_MIN_LENGTH)
    return { valid: false, message: `Password must be at least ${PASSWORD_MIN_LENGTH} characters` };
  if (!/[A-Z]/.test(password))
    return { valid: false, message: 'Password must contain at least one uppercase letter' };
  if (!/[a-z]/.test(password))
    return { valid: false, message: 'Password must contain at least one lowercase letter' };
  if (!/[0-9]/.test(password))
    return { valid: false, message: 'Password must contain at least one number' };
  if (!/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password))
    return { valid: false, message: 'Password must contain at least one special character' };
  return { valid: true };
}

const passwordRequirements = [
  { label: `At least ${PASSWORD_MIN_LENGTH} characters`, test: (p: string) => p.length >= PASSWORD_MIN_LENGTH },
  { label: 'One uppercase letter', test: (p: string) => /[A-Z]/.test(p) },
  { label: 'One lowercase letter', test: (p: string) => /[a-z]/.test(p) },
  { label: 'One number', test: (p: string) => /[0-9]/.test(p) },
  { label: 'One special character (!@#$%^&* etc.)', test: (p: string) => /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(p) },
];

export default function SignupPage() {
  const navigate = useNavigate();
  const setAuth = useAuthStore((state) => state.setAuth);

  const [formData, setFormData] = useState({ name: '', email: '', password: '', confirmPassword: '' });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (formData.password !== formData.confirmPassword) { setError('Passwords do not match'); return; }
    const passwordValidation = validatePassword(formData.password);
    if (!passwordValidation.valid) { setError(passwordValidation.message!); return; }
    setIsLoading(true);
    try {
      const response = await authAPI.signup({ name: formData.name, email: formData.email, password: formData.password });
      const { token, user } = response.data;
      setAuth(token, user);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Signup failed. Please try again.');
    } finally { setIsLoading(false); }
  };

  const passwordStrength = passwordRequirements.filter((r) => r.test(formData.password)).length;
  const strengthLabel = passwordStrength <= 1 ? 'Weak' : passwordStrength <= 3 ? 'Fair' : passwordStrength === 4 ? 'Good' : 'Strong';
  const strengthColor = passwordStrength <= 1 ? 'bg-red-500' : passwordStrength <= 3 ? 'bg-amber-500' : passwordStrength === 4 ? 'bg-blue-500' : 'bg-green-500';
  const strengthTextColor = passwordStrength >= 5 ? '#4ade80' : passwordStrength >= 4 ? '#60a5fa' : passwordStrength >= 3 ? '#fbbf24' : '#f87171';

  return (
    <div className="min-h-screen bg-page bg-hero-mesh flex items-center justify-center p-4">
      <div className="w-full max-w-[440px] animate-fade-up">

        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2.5 mb-6">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-600 to-violet-600 flex items-center justify-center shadow-glow-sm">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <span className="text-xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>PrepGenie</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>Create your account</h1>
          <p className="text-sm mt-1.5 font-normal" style={{ color: 'var(--text-secondary)' }}>Start practicing interviews for free today</p>
        </div>

        {/* Card */}
        <div className="card p-8">
          <form onSubmit={handleSubmit} className="space-y-5" noValidate>
            <Input label="Full Name" type="text" id="signup-name" placeholder="Alex Johnson"
              value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required autoComplete="name" />

            <Input label="Email address" type="email" id="signup-email" placeholder="you@example.com"
              value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required autoComplete="email" />

            <div className="space-y-2">
              <Input label="Password" type="password" id="signup-password" placeholder="••••••••"
                value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                required autoComplete="new-password" />

              {formData.password.length > 0 && (
                <div className="space-y-2 pt-1">
                  {/* Strength bar */}
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <div key={i} className={`h-1 flex-1 rounded-full transition-all duration-300 ${i <= passwordStrength ? strengthColor : 'opacity-20 bg-white'
                        }`} />
                    ))}
                  </div>
                  {/* Requirements */}
                  <div className="grid grid-cols-2 gap-1">
                    {passwordRequirements.map((req) => (
                      <div key={req.label} className={`flex items-center gap-1.5 text-xs transition-colors duration-200 ${req.test(formData.password) ? 'text-green-400' : ''
                        }`} style={req.test(formData.password) ? {} : { color: 'var(--text-tertiary)' }}>
                        <svg className="w-3 h-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                          {req.test(formData.password) ? (
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
                          ) : (
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clipRule="evenodd" />
                          )}
                        </svg>
                        <span className="truncate">{req.label}</span>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs font-semibold" style={{ color: strengthTextColor }}>
                    Strength: {strengthLabel}
                  </p>
                </div>
              )}
            </div>

            <Input label="Confirm Password" type="password" id="signup-confirm-password" placeholder="••••••••"
              value={formData.confirmPassword} onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
              required autoComplete="new-password" />

            {error && (
              <div role="alert" className="flex items-start gap-3 px-4 py-3 rounded-xl text-sm"
                style={{ background: 'rgba(239,68,68,.1)', border: '1px solid rgba(239,68,68,.25)', color: '#f87171' }}>
                <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-5a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0v-4.5A.75.75 0 0110 5zm0 10a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                </svg>
                <span>{error}</span>
              </div>
            )}

            <Button type="submit" isLoading={isLoading} size="lg" className="w-full mt-1">
              {isLoading ? 'Creating account…' : 'Create account'}
            </Button>
          </form>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full" style={{ borderTop: '1px solid var(--border)' }} />
            </div>
            <div className="relative flex justify-center">
              <span className="px-3 text-xs font-medium" style={{ background: 'var(--bg-card)', color: 'var(--text-tertiary)' }}>or</span>
            </div>
          </div>

          <p className="text-center text-sm" style={{ color: 'var(--text-secondary)' }}>
            Already have an account?{' '}
            <Link to="/login" className="font-semibold text-brand-400 hover:text-brand-300 transition-colors">
              Sign in
            </Link>
          </p>
        </div>

        <p className="text-center mt-6 text-xs" style={{ color: 'var(--text-muted)' }}>
          By creating an account you agree to our Terms &amp; Privacy Policy.
        </p>
      </div>
    </div>
  );
}
