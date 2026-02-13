interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export default function Input({
  label,
  error,
  className = '',
  ...props
}: InputProps) {
  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-neutral-900 mb-1.5">
          {label}
        </label>
      )}
      <input
        className={`
          w-full px-3.5 py-2.5 text-sm
          bg-white border rounded-lg
          transition-all duration-200
          placeholder:text-neutral-400
          focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
          disabled:bg-neutral-50 disabled:text-neutral-500 disabled:cursor-not-allowed
          ${error ? 'border-red-300 focus:ring-red-500' : 'border-neutral-300 hover:border-neutral-400'}
          ${className}
        `}
        {...props}
      />
      {error && <p className="mt-1.5 text-xs text-red-600">{error}</p>}
    </div>
  );
}
