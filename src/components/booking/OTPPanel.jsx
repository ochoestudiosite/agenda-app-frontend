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
  // Keep a ref to onVerify so the auto-submit effect never has a stale closure
  // and never needs onVerify in its dependency array (avoids an effect re-run on
  // every parent render).
  const onVerifyRef = useRef(onVerify);
  useLayoutEffect(() => { onVerifyRef.current = onVerify; });

  // Auto-focus first input on mount.
  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  // Auto-submit when all 6 digits are filled.
  useEffect(() => {
    if (digits.every(d => d !== '') && !loading && !verifyCalledRef.current) {
      verifyCalledRef.current = true;
      onVerifyRef.current(digits.join(''));
    }
  }, [digits, loading]); // intentionally omits onVerify — always current via ref

  function handleChange(i, val) {
    verifyCalledRef.current = false; // allow re-auto-submit if the user corrects a digit
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
    const pasted   = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!pasted) return;
    const next     = Array.from({ length: 6 }, (_, i) => pasted[i] || '');
    setDigits(next);
    const focusIdx = Math.min(pasted.length, 5);
    inputRefs.current[focusIdx]?.focus();
  }

  return (
    <div className="space-y-6">

      {/* Header */}
      <div>
        <h3 className="font-display text-xl font-semibold text-ink">Verifica tu número</h3>
        <p className="text-ink-3 text-sm mt-1 leading-relaxed">
          Ingresa el código de 6 dígitos que enviamos por SMS al
          {' '}<span className="font-semibold text-ink tabular-nums">{maskPhone(phone)}</span>
        </p>
      </div>

      {/* Digit inputs */}
      <div className="flex gap-2.5 justify-center" onPaste={handlePaste}>
        {digits.map((d, i) => (
          <input
            key={i}
            ref={el => { inputRefs.current[i] = el; }}
            type="tel"
            inputMode="numeric"
            pattern="\d"
            maxLength={2}
            value={d}
            disabled={loading}
            onChange={e => handleChange(i, e.target.value)}
            onKeyDown={e => handleKeyDown(i, e)}
            aria-label={`Dígito ${i + 1} de 6`}
            className={[
              'w-11 h-14 text-center text-[1.4rem] font-bold rounded-xl',
              'bg-card border-2 transition-all duration-150',
              'focus:outline-none focus:ring-2',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              error
                ? 'border-red-400 text-red-500 focus:ring-red-400/20 focus:border-red-400'
                : d
                  ? 'border-gold text-gold focus:ring-gold/30 focus:border-gold'
                  : 'border-edge text-ink hover:border-edge-strong focus:ring-gold/30 focus:border-gold',
            ].join(' ')}
          />
        ))}
      </div>

      {/* Error */}
      {error && (
        <p className="text-center text-sm text-red-500 flex items-center justify-center gap-1.5" role="alert">
          <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          {error}
        </p>
      )}

      {/* Verifying spinner */}
      {loading && !error && (
        <p className="text-center text-sm text-ink-3 flex items-center justify-center gap-2">
          <svg className="animate-spin h-4 w-4 text-gold shrink-0" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3.5" />
            <path className="opacity-80" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          Verificando…
        </p>
      )}

      {/* Resend + Back */}
      <div className="space-y-2.5 pt-1 text-center">
        <button
          type="button"
          disabled={resendCooldown > 0 || loading}
          onClick={onResend}
          className="text-sm text-ink-3 hover:text-gold disabled:opacity-50 disabled:cursor-not-allowed transition-colors py-1 w-full"
        >
          {resendCooldown > 0
            ? `¿No recibiste el código? Reenviar en ${resendCooldown}s`
            : '¿No recibiste el código? Reenviar'}
        </button>
        <button
          type="button"
          onClick={onBack}
          disabled={loading}
          className="text-sm text-ink-3 hover:text-ink disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-1.5 py-1 w-full"
        >
          <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Cambiar mis datos
        </button>
      </div>
    </div>
  );
}
