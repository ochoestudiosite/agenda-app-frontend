import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useBooking } from '../../context/BookingContext';
import { formatDate, formatTime, formatPrice } from '../../utils/formatters';
import Button from '../ui/Button';

export default function BookingConfirmation() {
  const { state, dispatch } = useBooking();
  const { confirmation } = state;

  return (
    <div className="animate-slide-up max-w-lg mx-auto text-center">
      {/* Success icon */}
      <div className="w-16 h-16 rounded-full bg-green-500/10 border-2 border-green-500/60 flex items-center justify-center mx-auto mb-6">
        <svg className="w-8 h-8 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      </div>

      <h2 className="font-display text-3xl font-bold mb-2 text-ink">¡Cita confirmada!</h2>
      <p className="text-ink-2 mb-8">Tu reservación ha sido registrada. Guarda tu código de confirmación.</p>

      {/* Confirmation code + copy button */}
      <div className="card p-6 mb-6">
        <p className="text-ink-3 text-xs uppercase tracking-widest mb-4 font-medium">Código de confirmación</p>

        <div className="flex items-center justify-center gap-1.5 mb-4">
          {confirmation?.code.split('').map((char, i) => (
            <span
              key={i}
              className="w-10 h-12 flex items-center justify-center bg-raised border border-edge rounded-lg font-display text-2xl font-bold text-gold select-all"
            >
              {char}
            </span>
          ))}
        </div>

        <CopyCodeButton code={confirmation?.code} />

        <p className="text-ink-3 text-xs mt-4">Necesitarás este código para reagendar o cancelar tu cita</p>
      </div>

      {/* Appointment details */}
      <div className="card p-5 text-left space-y-3 mb-8">
        <DetailRow icon={<ScissorsIcon />} label="Servicio" value={`${confirmation?.serviceName} — ${formatPrice(confirmation?.servicePrice)}`} />
        <DetailRow icon={<UserIcon />}     label="Barbero"  value={confirmation?.specialistName} />
        <DetailRow icon={<CalendarIcon />} label="Fecha"    value={formatDate(confirmation?.date)} />
        <DetailRow icon={<ClockIcon />}    label="Hora"     value={formatTime(confirmation?.time)} />
        <DetailRow icon={<PhoneIcon />}    label="Teléfono" value={confirmation?.clientPhone} />
      </div>

      <div className="flex gap-3 justify-center flex-wrap">
        <Button variant="outline" onClick={() => dispatch({ type: 'RESET' })}>
          Nueva cita
        </Button>
        <Link to="/gestionar">
          <Button variant="ghost">Ver mis citas</Button>
        </Link>
      </div>
    </div>
  );
}

/* ── Copy button ──────────────────────────────────────────────────────────── */
function CopyCodeButton({ code }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    if (!code || copied) return;
    try {
      await navigator.clipboard.writeText(code);
    } catch {
      // Fallback for browsers without Clipboard API
      const el = document.createElement('textarea');
      el.value = code;
      el.style.cssText = 'position:fixed;opacity:0;pointer-events:none';
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <button
      onClick={handleCopy}
      aria-label={copied ? 'Código copiado' : 'Copiar código de confirmación'}
      className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium
        border transition-all duration-200 cursor-pointer min-h-[44px]
        ${copied
          ? 'border-green-500/60 bg-green-500/10 text-green-600 dark:text-green-400'
          : 'border-gold/50 bg-gold/8 text-gold hover:bg-gold/15 hover:border-gold active:scale-[0.97]'
        }`}
    >
      {copied ? (
        <>
          <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
          ¡Código copiado!
        </>
      ) : (
        <>
          <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
          </svg>
          Copiar código
        </>
      )}
    </button>
  );
}

/* ── Detail row ───────────────────────────────────────────────────────────── */
function DetailRow({ icon, label, value }) {
  return (
    <div className="flex items-start gap-3">
      <span className="text-gold mt-0.5 shrink-0 w-4 h-4">{icon}</span>
      <div>
        <p className="text-ink-3 text-xs">{label}</p>
        <p className="text-ink text-sm font-medium leading-snug">{value}</p>
      </div>
    </div>
  );
}

/* ── Inline SVG icons (no emoji) ─────────────────────────────────────────── */
function ScissorsIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="w-4 h-4"><circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><line x1="20" y1="4" x2="8.12" y2="15.88"/><line x1="14.47" y1="14.48" x2="20" y2="20"/><line x1="8.12" y1="8.12" x2="12" y2="12"/></svg>;
}
function UserIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>;
}
function CalendarIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="w-4 h-4"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>;
}
function ClockIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="w-4 h-4"><circle cx="12" cy="12" r="10"/><polyline points="12,6 12,12 16,14"/></svg>;
}
function PhoneIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.09 12a19.79 19.79 0 01-3-8.61 2 2 0 012-2.18h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/></svg>;
}
