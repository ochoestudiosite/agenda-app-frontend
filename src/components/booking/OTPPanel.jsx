import { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { Lock, AlertCircle, Loader2, Clock, RefreshCw, ChevronLeft } from 'lucide-react';

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
          <Lock className="w-4.5 h-4.5 text-gold" strokeWidth={1.75} />
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
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            {error}
          </p>
        ) : loading ? (
          <p className="text-center text-[13px] text-ink-3 flex items-center gap-2">
            <Loader2 className="animate-spin h-3.5 w-3.5 text-gold shrink-0" />
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
              <Clock className="w-3.5 h-3.5 text-ink-3 shrink-0" />
              <span className="text-ink-3">Reenviar en <span className="tabular-nums">{resendCooldown}s</span></span>
            </>
          ) : (
            <>
              <RefreshCw className="w-3.5 h-3.5 text-gold shrink-0" />
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
          <ChevronLeft className="w-3.5 h-3.5 shrink-0" />
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
