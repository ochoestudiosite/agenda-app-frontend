import { useState, useRef, useEffect, useLayoutEffect } from 'react';

function maskPhone(phone) {
  const digits = (phone || '').replace(/\D/g, '');
  if (digits.length < 4) return phone;
  return `****${digits.slice(-4)}`;
}

export default function OTPPanel({ phone, loading, error, resendCooldown, onVerify, onResend, onBack }) {
  const [digits, setDigits] = useState(['', '', '', '', '', '']);
  const inputRefs       = useRef([]);
  const verifyCalledRef = useRef(false);
  const onVerifyRef     = useRef(onVerify);
  useLayoutEffect(() => { onVerifyRef.current = onVerify; });

  useEffect(() => { inputRefs.current[0]?.focus(); }, []);

  useEffect(() => {
    if (digits.every(d => d !== '') && !loading && !verifyCalledRef.current) {
      verifyCalledRef.current = true;
      onVerifyRef.current(digits.join(''));
    }
  }, [digits, loading]);

  function handleChange(i, val) {
    verifyCalledRef.current = false;
    const digit = val.replace(/\D/g, '').slice(-1);
    const next  = [...digits];
    next[i]     = digit;
    setDigits(next);
    if (digit && i < 5) inputRefs.current[i + 1]?.focus();
  }

  function handleKeyDown(i, e) {
    if (e.key === 'Backspace' && !digits[i] && i > 0) {
      const next  = [...digits];
      next[i - 1] = '';
      setDigits(next);
      inputRefs.current[i - 1]?.focus();
    }
    if (e.key === 'ArrowLeft'  && i > 0) inputRefs.current[i - 1]?.focus();
    if (e.key === 'ArrowRight' && i < 5) inputRefs.current[i + 1]?.focus();
  }

  function handlePaste(e) {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!pasted) return;
    const next   = Array.from({ length: 6 }, (_, i) => pasted[i] || '');
    setDigits(next);
    inputRefs.current[Math.min(pasted.length, 5)]?.focus();
  }

  const filled = digits.filter(Boolean).length;

  return (
    <div className="space-y-7">

      {/* Progress bar */}
      <div className="h-0.5 rounded-full bg-edge overflow-hidden">
        <div
          className="h-full bg-gold rounded-full transition-all duration-300 ease-out"
          style={{ width: `${(filled / 6) * 100}%` }}
        />
      </div>

      {/* Digit inputs — two groups of 3 */}
      <div className="flex items-center justify-center gap-2" onPaste={handlePaste}>
        {[0, 1, 2].map(i => (
          <input
            key={i}
            ref={el => { inputRefs.current[i] = el; }}
            type="tel"
            inputMode="numeric"
            pattern="\d"
            maxLength={2}
            value={digits[i]}
            disabled={loading}
            onChange={e => handleChange(i, e.target.value)}
            onKeyDown={e => handleKeyDown(i, e)}
            aria-label={`Dígito ${i + 1} de 6`}
            className={digitClass(digits[i], error, loading)}
          />
        ))}

        <span className="text-edge-strong/60 text-xl font-extralight px-1 select-none" aria-hidden="true">·</span>

        {[3, 4, 5].map(i => (
          <input
            key={i}
            ref={el => { inputRefs.current[i] = el; }}
            type="tel"
            inputMode="numeric"
            pattern="\d"
            maxLength={2}
            value={digits[i]}
            disabled={loading}
            onChange={e => handleChange(i, e.target.value)}
            onKeyDown={e => handleKeyDown(i, e)}
            aria-label={`Dígito ${i + 1} de 6`}
            className={digitClass(digits[i], error, loading)}
          />
        ))}
      </div>

      {/* Feedback row — error OR loading */}
      <div className="min-h-[22px] flex items-center justify-center">
        {error ? (
          <p className="text-center text-sm text-red-500 flex items-center gap-1.5" role="alert">
            <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            {error}
          </p>
        ) : loading ? (
          <p className="text-center text-sm text-ink-3 flex items-center gap-2">
            <svg className="animate-spin h-4 w-4 text-gold shrink-0" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-20" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3.5" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Verificando…
          </p>
        ) : null}
      </div>

      {/* Actions */}
      <div className="space-y-1 text-center">
        <button
          type="button"
          disabled={resendCooldown > 0 || loading}
          onClick={onResend}
          className="w-full py-2 text-sm text-ink-3 hover:text-gold disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          {resendCooldown > 0
            ? (
              <span className="inline-flex items-center gap-2">
                <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Reenviar en {resendCooldown}s
              </span>
            )
            : '¿No llegó el código? Reenviar'}
        </button>

        <button
          type="button"
          onClick={onBack}
          disabled={loading}
          className="w-full py-2 text-sm text-ink-3 hover:text-ink disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-1.5"
        >
          <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Editar mis datos
        </button>
      </div>
    </div>
  );
}

function digitClass(value, error, loading) {
  return [
    'w-11 h-[3.25rem] text-center text-[1.35rem] font-bold rounded-xl',
    'bg-card border-2 transition-all duration-150',
    'focus:outline-none focus:ring-2',
    'disabled:opacity-40 disabled:cursor-not-allowed',
    error
      ? 'border-red-400 text-red-500 focus:ring-red-300/25 focus:border-red-400'
      : value
        ? 'border-gold text-gold focus:ring-gold/25 focus:border-gold'
        : 'border-edge text-ink hover:border-edge-strong focus:ring-gold/20 focus:border-gold',
  ].join(' ');
}
