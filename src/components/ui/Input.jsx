export default function Input({ label, error, helper, className = '', ...props }) {
  return (
    <div className="flex flex-col gap-2">
      {label && (
        <label className="text-sm font-medium text-ink leading-none">
          {label}
          {props.required && <span className="text-gold/70 ml-1 text-xs" aria-hidden="true">*</span>}
        </label>
      )}
      <input
        className={[
          'w-full bg-card border rounded-xl px-4 text-[0.9375rem] text-ink',
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
        <svg className="w-3 h-3 shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
        {error}
      </p>}
      {helper && !error && <p className="text-xs text-ink-3">{helper}</p>}
    </div>
  );
}
