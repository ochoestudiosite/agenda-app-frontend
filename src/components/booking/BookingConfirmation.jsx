import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useBooking } from '../../context/BookingContext';
import { useConfig } from '../../hooks/useConfig';
import { formatDate, formatTime, formatPrice, toTitleCase } from '../../utils/formatters';
import Button from '../ui/Button';

export default function BookingConfirmation() {
  const { state, dispatch } = useBooking();
  const { data: config }    = useConfig();
  const timeFmt             = config?.time_format ?? '12h';
  const { confirmation }    = state;

  const isGroup    = !!confirmation?.groupCode;
  const displayCode = isGroup ? confirmation.groupCode : confirmation?.code;

  return (
    <div className="animate-fade-up max-w-md mx-auto px-1">

      {/* ── Success hero ─────────────────────────────────────────────────── */}
      <div className="flex flex-col items-center text-center mb-10">
        {/* Layered ring icon — Apple-style */}
        <div className="relative mb-7 animate-scale-in">
          <div className="absolute inset-0 rounded-full bg-gold/8 scale-[1.35]" />
          <div className="absolute inset-0 rounded-full bg-gold/12 scale-[1.15]" />
          <div className="w-20 h-20 rounded-full bg-gold/15 border-2 border-gold/40 flex items-center justify-center">
            <svg className="w-9 h-9 text-gold" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
        </div>

        <h2 className="font-display text-[1.75rem] font-bold text-ink tracking-tight leading-tight">
          {isGroup ? '¡Visita confirmada!' : '¡Cita confirmada!'}
        </h2>
        <p className="text-ink-3 text-sm mt-2.5 max-w-[260px] leading-relaxed">
          Guarda tu código — lo necesitarás para gestionar o cancelar tu {isGroup ? 'visita' : 'cita'}.
        </p>
      </div>

      {/* ── Ticket card ──────────────────────────────────────────────────── */}
      <div className="bg-card border border-edge rounded-3xl shadow-sm mb-4 overflow-hidden">

        {/* Code section */}
        <div className="px-6 pt-6 pb-5 text-center">
          <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-ink-3 mb-5">
            {isGroup ? 'Código de grupo' : 'Código de confirmación'}
          </p>

          {/* Characters */}
          <div className="flex items-center justify-center gap-1.5 flex-wrap mb-5">
            {displayCode?.split('').map((char, i) => (
              <span
                key={i}
                className="w-10 h-12 flex items-center justify-center
                           bg-raised border border-edge rounded-xl
                           font-mono text-[1.35rem] font-bold text-gold
                           tabular-nums select-all tracking-wider"
              >
                {char}
              </span>
            ))}
          </div>

          <CopyCodeButton code={displayCode} />
        </div>

        {/* Perforated divider */}
        <div className="relative flex items-center px-5 my-1">
          <div className="w-full border-t-2 border-dashed border-edge/60" />
        </div>

        {/* Details section */}
        <div className="px-6 pt-5 pb-6 space-y-3">
          {isGroup ? (
            <>
              {(confirmation.appointments ?? []).map((appt, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-gold/10 border border-gold/20 flex items-center justify-center shrink-0 mt-px">
                    <span className="text-[9px] font-bold text-gold leading-none">{i + 1}</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-semibold text-ink leading-snug">
                      {toTitleCase(appt.serviceName)}
                    </p>
                    <p className="text-[11.5px] text-ink-3 mt-0.5 leading-snug">
                      {toTitleCase(appt.specialistName)}
                      {' · '}
                      <span className="text-gold font-medium">{formatTime(appt.time, timeFmt)}</span>
                      {' · '}{appt.serviceDuration} min
                    </p>
                  </div>
                  <p className="text-[12px] font-semibold text-gold tabular-nums shrink-0">
                    {appt.priceType === 'ask' ? 'A consultar' : formatPrice(appt.servicePrice)}
                  </p>
                </div>
              ))}

              <div className="pt-3.5 border-t border-edge space-y-2.5">
                <DetailRow icon={<CalendarIcon />} label="Fecha"    value={formatDate(confirmation.date)} />
                <DetailRow icon={<PhoneIcon />}    label="Teléfono" value={confirmation.clientPhone} />
                {state.branch?.name && (
                  <DetailRow icon={<MapPinIcon />} label="Sucursal" value={toTitleCase(state.branch.name)} />
                )}
              </div>
            </>
          ) : (
            <>
              <DetailRow
                icon={<ScissorsIcon />}
                label="Servicio"
                value={toTitleCase(confirmation?.serviceName)}
                extra={confirmation?.priceType === 'ask' ? 'A consultar' : formatPrice(confirmation?.servicePrice)}
              />
              <DetailRow icon={<UserIcon />}     label="Especialista" value={toTitleCase(confirmation?.specialistName)} />
              {state.branch?.name && (
                <DetailRow icon={<MapPinIcon />} label="Sucursal" value={toTitleCase(state.branch.name)} />
              )}
              <DetailRow icon={<CalendarIcon />} label="Fecha"    value={formatDate(confirmation?.date)} />
              <DetailRow icon={<ClockIcon />}    label="Hora"     value={formatTime(confirmation?.time, timeFmt)} />
              <DetailRow icon={<PhoneIcon />}    label="Teléfono" value={confirmation?.clientPhone} />
            </>
          )}
        </div>
      </div>

      {/* Tip */}
      <p className="text-center text-[11.5px] text-ink-3 mb-8 leading-relaxed">
        Accede a{' '}
        <Link to="/gestionar" className="text-gold font-medium hover:underline underline-offset-2">
          Gestionar
        </Link>
        {' '}para ver, modificar o cancelar tu {isGroup ? 'visita' : 'cita'}.
      </p>

      {/* ── CTAs ─────────────────────────────────────────────────────────── */}
      <div className="flex gap-3">
        <Button
          variant="outline"
          className="flex-1"
          onClick={() => dispatch({ type: 'RESET' })}
        >
          Nueva cita
        </Button>
        <Link to="/gestionar" className="flex-1">
          <Button className="w-full">Ver mis citas</Button>
        </Link>
      </div>
    </div>
  );
}

// ── Copy button ───────────────────────────────────────────────────────────────

function CopyCodeButton({ code }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    if (!code || copied) return;
    try {
      await navigator.clipboard.writeText(code);
    } catch {
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
      className={[
        'inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold',
        'border transition-all duration-200 cursor-pointer min-h-[44px] active:scale-[0.97]',
        copied
          ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
          : 'border-gold/40 bg-gold/8 text-gold hover:bg-gold/15 hover:border-gold/60',
      ].join(' ')}
    >
      {copied ? (
        <>
          <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
          ¡Copiado!
        </>
      ) : (
        <>
          <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <rect x="9" y="9" width="13" height="13" rx="2" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
          </svg>
          Copiar código
        </>
      )}
    </button>
  );
}

// ── Detail row ────────────────────────────────────────────────────────────────

function DetailRow({ icon, label, value, extra }) {
  return (
    <div className="flex items-center gap-3 min-w-0">
      <span className="text-gold shrink-0">{icon}</span>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-ink-3 leading-none mb-0.5">
          {label}
        </p>
        <p className="text-[13px] font-medium text-ink leading-snug truncate">{value}</p>
      </div>
      {extra && (
        <p className="text-[12px] font-semibold text-gold tabular-nums shrink-0">{extra}</p>
      )}
    </div>
  );
}

// ── Icons ─────────────────────────────────────────────────────────────────────

function ScissorsIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="w-4 h-4">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.847a4.5 4.5 0 003.09 3.09L15.75 12l-2.847.813a4.5 4.5 0 00-3.09 3.09z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456z" />
    </svg>
  );
}
function UserIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="w-4 h-4">
      <path strokeLinecap="round" strokeLinejoin="round" d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/>
      <circle cx="12" cy="7" r="4"/>
    </svg>
  );
}
function CalendarIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="w-4 h-4">
      <rect x="3" y="4" width="18" height="18" rx="2"/>
      <line x1="16" y1="2" x2="16" y2="6"/>
      <line x1="8" y1="2" x2="8" y2="6"/>
      <line x1="3" y1="10" x2="21" y2="10"/>
    </svg>
  );
}
function ClockIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="w-4 h-4">
      <circle cx="12" cy="12" r="10"/>
      <polyline points="12,6 12,12 16,14"/>
    </svg>
  );
}
function PhoneIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="w-4 h-4">
      <path strokeLinecap="round" strokeLinejoin="round" d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.09 12a19.79 19.79 0 01-3-8.61 2 2 0 012-2.18h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/>
    </svg>
  );
}
function MapPinIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="w-4 h-4">
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0118 0z"/>
      <circle cx="12" cy="10" r="3"/>
    </svg>
  );
}
