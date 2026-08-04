import { AlertCircle } from 'lucide-react';

export default function Input({ label, error, helper, className = '', id, ...props }) {
  return (
    <div className="flex flex-col gap-2">
      {label && (
        <label htmlFor={id} className="text-sm font-medium text-ink leading-none">
          {label}
          {props.required && <span className="text-gold/70 ml-1 text-xs" aria-hidden="true">*</span>}
        </label>
      )}
      <input
        id={id}
        className={[
          'w-full bg-card border rounded-xl px-4 text-[16px] text-ink',
          'placeholder:text-ink-3 min-h-[52px]',
          'transition-all duration-160 ease-spring',
          'focus:outline-none focus:ring-2 focus:ring-gold/30 focus:border-gold',
          error
            ? 'border-red-500 focus:ring-red-500/20 focus:border-red-500'
            : 'border-edge hover:border-edge-strong',
          className,
        ].join(' ')}
        {...props}
      />
      {error  && <p className="text-xs text-red-500 flex items-center gap-1" role="alert">
        <AlertCircle className="w-3 h-3 shrink-0" />
        {error}
      </p>}
      {helper && !error && <p className="text-xs text-ink-3">{helper}</p>}
    </div>
  );
}
