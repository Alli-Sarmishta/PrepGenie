interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  children: React.ReactNode;
}

export default function Button({
  variant = 'primary',
  size = 'md',
  isLoading = false,
  children,
  className = '',
  disabled,
  ...props
}: ButtonProps) {
  const base =
    'inline-flex items-center justify-center gap-2 font-semibold tracking-tight transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0c0e1a] select-none cursor-pointer';

  const sizes = {
    sm: 'px-3 py-1.5 text-xs rounded-lg',
    md: 'px-4 py-2 text-sm rounded-[10px]',
    lg: 'px-6 py-2.5 text-sm rounded-xl',
  };

  const variants = {
    primary: [
      'text-white border-0',
      'bg-gradient-to-r from-brand-600 to-violet-600',
      'shadow-[0_2px_12px_rgba(99,102,241,.45)]',
      'hover:shadow-[0_4px_20px_rgba(99,102,241,.6)] hover:-translate-y-px',
      'active:translate-y-0 active:shadow-[0_1px_6px_rgba(99,102,241,.35)]',
    ].join(' '),

    secondary: [
      'text-white/80 border',
      'bg-white/5 border-white/10',
      'hover:bg-white/10 hover:border-white/20 hover:text-white',
      'active:bg-white/15',
    ].join(' '),

    danger: [
      'text-white border-0',
      'bg-gradient-to-r from-red-600 to-rose-600',
      'shadow-[0_2px_8px_rgba(239,68,68,.35)]',
      'hover:shadow-[0_4px_16px_rgba(239,68,68,.45)] hover:-translate-y-px',
      'active:translate-y-0',
    ].join(' '),

    ghost: [
      'bg-transparent border-0',
      'hover:bg-white/8 hover:text-white',
      'active:bg-white/12',
    ].join(' '),
  };

  // Ghost text color via inline style since CSS var isn't Tailwind-native
  const ghostStyle = variant === 'ghost' ? { color: 'var(--text-secondary)' } : {};

  return (
    <button
      className={`${base} ${sizes[size]} ${variants[variant]} ${className}`}
      style={ghostStyle}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <>
          <svg className="animate-spin h-4 w-4 opacity-70" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <span>Loading…</span>
        </>
      ) : (
        children
      )}
    </button>
  );
}
