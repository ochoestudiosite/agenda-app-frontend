import { useState, useRef, useEffect, useLayoutEffect } from 'react';

function maskPhone(phone) {
  const digits = (phone || '').replace(/\D/g, '');
  if (digits.length < 4) return phone;
  return `****${digits.slice(-4)}`;
}

export default function OTPPanel({ phone, loading, error, resendCooldown, onVerify, onResend, onBack, backLabel = 'Editar mis datos' }) {
  const [digits, setDigits]     = useState(['', '', '', '', '', '']);
  const [isShaking, setShaking] = useState(false);
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

  useEffect(() => {
    if (!error) return;
    setShaking(true);
    const t = setTimeout(() => setShaking(false), 420);
    return () => clearTimeout(t);
  }, [error]);

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
    const next = Array.from({ length: 6 }, (_, i) => pasted[i] || '');
    setDigits(next);
    inputRefs.current[Math.min(pasted.length, 5)]?.focus();
  }

  const filled = digits.filter(Boolean).length;

  return (
    <div className="card p-5 sm:p-6 animate-fade-in">
      <style>{`
        @keyframes otp-shake {
          0%, 100% { transform: translateX(0); }
          15% { transform: translateX(-8px); }
          30% { transform: translateX(8px); }
          45% { transform: translateX(-5px); }
          60% { transform: translateX(5px); }
          75% { transform: translateX(-2px); }
        }
        .otp-shake { animation: otp-shake 0.42s ease-out; }
      `}</style>

      {/* Header */}
      <div className="flex items-center gap-3 mb-5">
        <div className="w-10 h-10 rounded-xl bg-gold/10 border border-gold/20 flex items-center justify-center shrink-0">
          <svg className="w-4.5 h-4.5 text-gold" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
          </svg>
        </div>
        <div className="text-left">
          <p className="text-[15px] font-semibold text-ink leading-tight">Ingresa el código</p>
          {phone && (
            <p className="text-[13px] text-ink-3 mt-0.5 leading-tight">
              Enviado a <span className="font-mono font-medium text-ink tracking-wider">{maskPhone(phone)}</span>
            </p>
          )}
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-0.5 rounded-full bg-edge overflow-hidden mb-5">
        <div
          className="h-full bg-gold rounded-full transition-all duration-500 ease-out"
          style={{ width: `${(filled / 6) * 100}%` }}
        />
      </div>

      {/* Digit inputs — two groups of 3 */}
      <div
        className={`flex items-center justify-center gap-2 sm:gap-2.5 ${isShaking ? 'otp-shake' : ''}`}
        onPaste={handlePaste}
      >
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

        <span className="flex flex-col items-center gap-1.5 px-0.5 shrink-0" aria-hidden="true">
          <span className="w-1 h-1 rounded-full bg-ink-3/30 block" />
          <span className="w-1 h-1 rounded-full bg-ink-3/30 block" />
        </span>

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
      <div className="min-h-[20px] flex items-center justify-center mt-4">
        {error ? (
          <p className="text-center text-[13px] text-red-500 flex items-center gap-1.5" role="alert">
            <svg className="w-3.5 h-3.5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            {error}
          </p>
        ) : loading ? (
          <p className="text-center text-[13px] text-ink-3 flex items-center gap-2">
            <svg className="animate-spin h-3.5 w-3.5 text-gold shrink-0" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-20" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3.5" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Verificando…
          </p>
        ) : null}
      </div>

      {/* Actions */}
      <div className="mt-5 pt-4 border-t border-edge space-y-0.5">
        <button
          type="button"
          disabled={resendCooldown > 0 || loading}
          onClick={onResend}
          className="w-full py-2 flex items-center justify-center gap-2 rounded-xl text-[13px] font-medium transition-colors duration-150 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-raised/70"
        >
          {resendCooldown > 0 ? (
            <>
              <svg className="w-3.5 h-3.5 text-ink-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-ink-3">Reenviar en <span className="tabular-nums">{resendCooldown}s</span></span>
            </>
          ) : (
            <>
              <svg className="w-3.5 h-3.5 text-gold shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span className="text-gold">¿No llegó? Reenviar código</span>
            </>
          )}
        </button>

        <button
          type="button"
          onClick={onBack}
          disabled={loading}
          className="w-full py-2 flex items-center justify-center gap-1.5 rounded-xl text-[13px] text-ink-3 hover:text-ink disabled:opacity-40 disabled:cursor-not-allowed transition-colors duration-150 hover:bg-raised/70"
        >
          <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          {backLabel}
        </button>
      </div>
    </div>
  );
}

function digitClass(value, error, loading) {
  return [
    'w-[46px] h-[56px] sm:w-[52px] sm:h-[60px] text-center text-[22px] font-bold rounded-2xl',
    'border-2 transition-all duration-150 caret-gold',
    'focus:outline-none disabled:cursor-not-allowed',
    loading ? 'opacity-50' : '',
    error
      ? 'bg-red-500/6 border-red-400/70 text-red-500 focus:border-red-400/70'
      : value
        ? 'bg-gold/10 border-gold text-gold'
        : 'bg-raised border-edge text-ink hover:border-edge-strong focus:border-gold focus:ring-[3px] focus:ring-gold/12',
  ].filter(Boolean).join(' ');
}
