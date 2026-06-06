export function Button({ children, variant = 'primary', className = '', disabled, loading, ...props }) {
  const base = 'px-4 py-2.5 rounded-lg font-medium transition-all duration-200 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed'
  const variants = {
    primary: 'bg-accent text-white hover:bg-accent-dark',
    secondary: 'bg-navy text-white hover:bg-navy-light',
    outline: 'border border-gray-200 text-gray-700 hover:border-accent hover:text-accent bg-white',
    ghost: 'text-gray-600 hover:text-accent hover:bg-gray-50',
  }
  return (
    <button className={`${base} ${variants[variant]} ${className}`} disabled={disabled || loading} {...props}>
      {loading && (
        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      )}
      {children}
    </button>
  )
}
