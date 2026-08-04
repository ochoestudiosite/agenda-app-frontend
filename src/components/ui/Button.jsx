import { Loader2 } from 'lucide-react';

export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  className = '',
  ...props
}) {
  const base = [
    'inline-flex items-center justify-center font-medium rounded-xl',
    'transition-all duration-160 ease-spring cursor-pointer',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 focus-visible:ring-offset-surface',
    'disabled:opacity-40 disabled:cursor-not-allowed',
    'active:scale-[0.97]',
    'touch-action-manipulation',
  ].join(' ');

  const variants = {
    primary: 'bg-gold text-on-gold hover:bg-gold-light shadow-xs hover:shadow-card',
    outline: 'border border-edge-strong text-ink-2 hover:text-ink hover:border-gold hover:bg-gold/5',
    ghost:   'text-ink-2 hover:text-ink hover:bg-raised',
    danger:  'bg-red-600 dark:bg-red-700 text-white hover:bg-red-500 dark:hover:bg-red-600 shadow-xs',
    subtle:  'bg-raised text-ink-2 hover:text-ink hover:bg-edge border border-edge',
  };

  const sizes = {
    sm: 'text-sm px-3.5 py-2 gap-1.5 min-h-[36px]',
    md: 'text-sm px-4 py-2.5 gap-2 min-h-[44px]',
    lg: 'text-[0.9375rem] px-6 py-3.5 gap-2 min-h-[52px]',
  };

  return (
    <button
      className={`${base} ${variants[variant]} ${sizes[size]} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading && <Loader2 className="animate-spin h-4 w-4 shrink-0" />}
      {children}
    </button>
  );
}
