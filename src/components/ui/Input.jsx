export default function Input({ label, error, helper, className = '', ...props }) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label className="text-sm font-medium text-ink-2">
          {label}
          {props.required && <span className="text-gold ml-1" aria-hidden="true">*</span>}
        </label>
      )}
      <input
        className={`bg-raised border rounded-lg px-3.5 py-2.5 text-sm text-ink placeholder:text-ink-3
          min-h-[44px] transition-colors duration-150 focus:outline-none focus:border-gold
          ${error
            ? 'border-red-500 focus:border-red-500'
            : 'border-edge hover:border-edge-strong'
          }
          ${className}`}
        {...props}
      />
      {error  && <p className="text-xs text-red-500" role="alert">{error}</p>}
      {helper && !error && <p className="text-xs text-ink-3">{helper}</p>}
    </div>
  );
}
