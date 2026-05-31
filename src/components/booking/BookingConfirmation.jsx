import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useBooking } from '../../context/BookingContext';
import { useConfig } from '../../hooks/useConfig';
import { useServices } from '../../hooks/useServices';
import { useSpecialists } from '../../hooks/useSpecialists';
import { formatDate, formatTime, formatPrice, toTitleCase } from '../../utils/formatters';
import Button from '../ui/Button';

const MONTH_SHORT = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];

function initials(name) {
  return (name || '').split(' ').filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join('') || '?';
}

function displayPrice(priceType, price) {
  if (priceType === 'ask') return 'A consultar';
  if (priceType === 'range' || priceType === 'starting_from') return `${formatPrice(price)}+`;
  return formatPrice(price);
}

export default function BookingConfirmation() {
  const { state, dispatch } = useBooking();
  const { data: config }    = useConfig();
  const { data: svcData }   = useServices();
  const timeFmt             = config?.time_format ?? '12h';
  const branches            = config?.branches    ?? [];
  const { confirmation }    = state;
  const isGroup             = !!confirmation?.groupCode;
  const displayCode         = isGroup ? confirmation?.groupCode : confirmation?.code;

  const { data: specialistsData } = useSpecialists();
  const allSpecialists = specialistsData?.specialists ?? [];

  // Single appointment lookups — prefer state objects set during flow
  const specialist = state.specialist
    ?? allSpecialists.find(s => String(s.id) === String(confirmation?.specialistId));
  const service    = state.service
    ?? svcData?.services?.find(s => s.name?.toLowerCase() === confirmation?.serviceName?.toLowerCase());
  const branch     = branches.find(b => String(b.id) === String(state.branch?.id))
    ?? state.branch;

  // Group totals
  const appts        = confirmation?.appointments ?? [];
  const startTime    = appts[0]?.time ?? null;
  const totalDuration = isGroup ? appts.reduce((s, a) => s + (a.serviceDuration ?? 0), 0) : 0;
  const totalPrice    = isGroup ? appts.reduce((s, a) => s + (a.servicePrice   ?? 0), 0) : 0;

  const apptDate  = confirmation?.date ? new Date(confirmation.date + 'T12:00:00') : null;
  const monthAbbr = apptDate ? MONTH_SHORT[apptDate.getMonth()] : '';
  const dayNum    = confirmation?.date?.split('-')[2] ?? '';

  return (
    <div className="animate-fade-up max-w-md mx-auto px-1">

      {/* ── Success hero ─────────────────────────────────────────────────── */}
      <div className="flex flex-col items-center text-center mb-7">
        <div className="relative mb-5 animate-scale-in">
          <div className="absolute inset-0 rounded-full bg-gold/8 scale-[1.35]" />
          <div className="absolute inset-0 rounded-full bg-gold/12 scale-[1.15]" />
          <div className="w-16 h-16 rounded-full bg-gold/15 border-2 border-gold/40 flex items-center justify-center">
            <svg className="w-7 h-7 text-gold" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
        </div>
        <h2 className="font-display text-[1.65rem] font-bold text-ink tracking-tight leading-tight">
          {isGroup ? '¡Visita confirmada!' : '¡Cita confirmada!'}
        </h2>
        <p className="text-ink-3 text-sm mt-2 max-w-[240px] leading-relaxed">
          Guarda tu código — lo necesitarás para gestionar o cancelar tu {isGroup ? 'visita' : 'cita'}.
        </p>
      </div>

      {/* ── Appointment card ─────────────────────────────────────────────── */}
      <div className="card overflow-hidden mb-3">

        {/* Status accent line */}
        <div className="h-[3px] bg-gold" />

        {/* Code + status badge */}
        <div className="px-6 pt-5 pb-4 flex items-start justify-between gap-3 border-b border-edge">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="font-mono text-[22px] font-bold text-gold tracking-[0.18em] leading-tight select-all">
                {displayCode}
              </p>
              <CopyIconButton code={displayCode} />
            </div>
            <div className="mt-1 space-y-0.5">
              <p className="text-xs text-ink-3 truncate">
                {confirmation?.clientName ? `${toTitleCase(confirmation.clientName)} · ` : ''}{confirmation?.clientPhone}
              </p>
              {state.clientEmail && (
                <p className="text-xs text-ink-3 truncate">{state.clientEmail}</p>
              )}
            </div>
          </div>
          <span className="shrink-0 inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold bg-gold/12 text-gold border border-gold/25">
            Confirmada
          </span>
        </div>

        {/* Date + Time */}
        <div className="px-6 py-4 flex items-center gap-4 border-b border-edge">
          <div className="w-12 h-12 rounded-2xl bg-gold/8 border border-gold/20 flex flex-col items-center justify-center shrink-0">
            <span className="text-[9px] font-bold uppercase tracking-widest text-gold leading-none">{monthAbbr}</span>
            <span className="text-[22px] font-bold text-gold leading-tight tabular-nums">{dayNum}</span>
          </div>
          <div className="flex-1">
            <p className="text-[14px] font-semibold text-ink leading-snug">{formatDate(confirmation?.date)}</p>
            <p className="text-[22px] font-bold text-gold tabular-nums leading-tight">
              {formatTime(isGroup ? startTime : confirmation?.time, timeFmt)}
            </p>
          </div>
          {isGroup && (
            <div className="text-right shrink-0">
              <p className="text-xs text-ink-3 tabular-nums">{totalDuration} min</p>
              <p className="text-xs text-ink-3">
                {appts.length} {appts.length === 1 ? 'servicio' : 'servicios'}
              </p>
            </div>
          )}
        </div>

        {/* ── GROUP: services list ────────────────────────────────────────── */}
        {isGroup ? (
          <>
            <div className="px-6 py-4 border-b border-edge">
              <p className="label-section mb-3">Servicios</p>
              <div className="space-y-2.5">
                {appts.map((appt, i) => {
                  const spec    = allSpecialists.find(s => String(s.id) === String(appt.specialistId));
                  const svcObj  = svcData?.services?.find(s => s.name?.toLowerCase() === appt.serviceName?.toLowerCase());
                  return (
                    <div key={appt.code || appt.id || i} className="flex items-start gap-3">
                      {/* Service avatar */}
                      <div className="w-9 h-9 rounded-full border-2 border-gold/20 bg-gold/8 flex items-center justify-center shrink-0 overflow-hidden mt-0.5">
                        {svcObj?.imageUrl
                          ? <img src={svcObj.imageUrl} alt={appt.serviceName} className="w-full h-full object-cover" />
                          : <span className="text-[11px] font-bold text-gold">{initials(appt.serviceName)}</span>
                        }
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[13px] font-semibold text-ink leading-snug">
                          {toTitleCase(appt.serviceName)}
                        </p>
                        {/* Specialist mini-avatar + info */}
                        <div className="flex items-center gap-1.5 mt-1">
                          <div className="w-5 h-5 rounded-full border border-gold/30 bg-gold/8 flex items-center justify-center shrink-0 overflow-hidden">
                            {spec?.avatarUrl
                              ? <img src={spec.avatarUrl} alt={appt.specialistName} className="w-full h-full object-cover" />
                              : <span className="text-[8px] font-bold text-gold">{initials(appt.specialistName)}</span>
                            }
                          </div>
                          <p className="text-[11px] text-ink-3 leading-none">
                            {toTitleCase(appt.specialistName)}
                            {' · '}
                            <span className="text-gold font-medium">{formatTime(appt.time, timeFmt)}</span>
                            {' · '}{appt.serviceDuration} min
                          </p>
                        </div>
                      </div>
                      <p className="text-[13px] font-semibold text-gold tabular-nums shrink-0">
                        {displayPrice(appt.priceType, appt.servicePrice)}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Branch (group) */}
            {branch?.name && (
              <div className="px-6 py-4 border-b border-edge">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full border-2 border-gold/20 bg-gold/8 flex items-center justify-center shrink-0 overflow-hidden">
                    {branch?.image_url
                      ? <img src={branch.image_url} alt={branch.name} className="w-full h-full object-cover" />
                      : <span className="text-sm font-bold text-gold">{initials(branch.name)}</span>
                    }
                  </div>
                  <div>
                    <p className="label-section">Sucursal</p>
                    <p className="text-[14px] font-semibold text-ink mt-0.5">{toTitleCase(branch.name)}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Total (group) */}
            <div className="px-6 py-3.5 flex items-center justify-between bg-raised/30">
              <span className="text-[13px] font-semibold text-ink">Total</span>
              <span className="text-[18px] font-bold text-gold tabular-nums">
                {(() => {
                  const allAsk = appts.every(a => a.priceType === 'ask');
                  const hasVariable = appts.some(a => a.priceType === 'ask' || a.priceType === 'range' || a.priceType === 'starting_from');
                  if (allAsk) return 'A consultar';
                  if (hasVariable) return `${formatPrice(totalPrice)}+`;
                  return formatPrice(totalPrice);
                })()}
              </span>
            </div>
          </>
        ) : (
          <>
            {/* ── SINGLE: service(s) ──────────────────────────────────────── */}
            <div className="px-6 py-4 border-b border-edge">
              <p className="label-section mb-3">
                {confirmation?.services?.length > 1 ? 'Servicios' : 'Servicio'}
              </p>
              {confirmation?.services?.length > 1 ? (
                <div className="space-y-2.5">
                  {confirmation.services.map((svc, i) => (
                    <div key={svc.id || svc.slug || i} className="flex items-start gap-3">
                      <div className="w-9 h-9 rounded-full overflow-hidden border-2 border-gold/20 bg-gold/8 flex items-center justify-center shrink-0 mt-0.5">
                        {svc.imageUrl
                          ? <img src={svc.imageUrl} alt={svc.serviceName} className="w-full h-full object-cover" />
                          : <span className="text-[11px] font-bold text-gold">{initials(svc.serviceName)}</span>
                        }
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-semibold text-ink leading-snug truncate">
                          {toTitleCase(svc.serviceName)}
                        </p>
                        <p className="text-xs text-ink-3 mt-0.5">{svc.serviceDuration} min</p>
                      </div>
                      <p className="text-[14px] font-bold text-gold tabular-nums shrink-0 mt-0.5">
                        {displayPrice(svc.priceType, svc.servicePrice)}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-gold/20 bg-gold/8 flex items-center justify-center shrink-0">
                    {service?.imageUrl
                      ? <img src={service.imageUrl} alt={confirmation?.serviceName} className="w-full h-full object-cover" />
                      : <span className="text-sm font-bold text-gold">{initials(confirmation?.serviceName)}</span>
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[15px] font-semibold text-ink leading-snug truncate">
                      {toTitleCase(confirmation?.serviceName)}
                    </p>
                    {confirmation?.serviceDuration && (
                      <p className="text-xs text-ink-3 mt-0.5">{confirmation.serviceDuration} min</p>
                    )}
                  </div>
                  <p className="text-[17px] font-bold text-gold tabular-nums shrink-0">
                    {displayPrice(confirmation?.priceType, confirmation?.servicePrice)}
                  </p>
                </div>
              )}
            </div>

            {/* ── SINGLE: specialist ──────────────────────────────────────── */}
            <div className={`px-6 py-4 ${branch?.name ? 'border-b border-edge' : ''}`}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full border-2 border-gold/20 bg-gold/8 flex items-center justify-center shrink-0 overflow-hidden">
                  {specialist?.avatarUrl
                    ? <img src={specialist.avatarUrl} alt={confirmation?.specialistName} className="w-full h-full object-cover" />
                    : <span className="text-sm font-bold text-gold">{initials(confirmation?.specialistName)}</span>
                  }
                </div>
                <div>
                  <p className="label-section">Especialista</p>
                  <p className="text-[14px] font-semibold text-ink mt-0.5">{toTitleCase(confirmation?.specialistName)}</p>
                </div>
              </div>
            </div>

            {/* ── SINGLE: branch ──────────────────────────────────────────── */}
            {branch?.name && (
              <div className="px-6 py-4 border-b border-edge">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full border-2 border-gold/20 bg-gold/8 flex items-center justify-center shrink-0 overflow-hidden">
                    {branch?.image_url
                      ? <img src={branch.image_url} alt={branch.name} className="w-full h-full object-cover" />
                      : <span className="text-sm font-bold text-gold">{initials(branch.name)}</span>
                    }
                  </div>
                  <div>
                    <p className="label-section">Sucursal</p>
                    <p className="text-[14px] font-semibold text-ink mt-0.5">{toTitleCase(branch.name)}</p>
                  </div>
                </div>
              </div>
            )}

            {/* ── SINGLE: total ───────────────────────────────────────────── */}
            <div className="px-6 py-3.5 flex items-center justify-between bg-raised/30">
              <span className="text-[13px] font-semibold text-ink">Total</span>
              <span className="text-[18px] font-bold text-gold tabular-nums">
                {displayPrice(confirmation?.priceType, confirmation?.servicePrice)}
              </span>
            </div>
          </>
        )}
      </div>

      {/* Tip */}
      <p className="text-center text-[11.5px] text-ink-3 mb-5 leading-relaxed">
        Accede a{' '}
        <Link to="/gestionar" className="text-gold font-medium hover:underline underline-offset-2">
          Gestionar
        </Link>
        {' '}para ver, modificar o cancelar tu {isGroup ? 'visita' : 'cita'}.
      </p>

      {/* CTAs */}
      <div className="flex gap-3">
        <Button variant="outline" className="flex-1" onClick={() => dispatch({ type: 'RESET' })}>
          Nueva cita
        </Button>
        <Link to="/gestionar" className="flex-1">
          <Button className="w-full">Ver mis citas</Button>
        </Link>
      </div>
    </div>
  );
}

// ── Copy icon button (compact, inline with code) ──────────────────────────────

function CopyIconButton({ code }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    if (!code || copied) return;
    try {
      await navigator.clipboard.writeText(code);
    } catch { /* clipboard API no disponible — fallback execCommand */
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
      aria-label={copied ? 'Código copiado' : 'Copiar código'}
      title={copied ? '¡Copiado!' : 'Copiar código'}
      className={[
        'w-7 h-7 rounded-lg flex items-center justify-center shrink-0',
        'border transition-all duration-150 cursor-pointer active:scale-95',
        copied
          ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-500'
          : 'border-gold/30 bg-gold/8 text-gold hover:bg-gold/15 hover:border-gold/50',
      ].join(' ')}
    >
      {copied ? (
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      ) : (
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <rect x="9" y="9" width="13" height="13" rx="2" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
        </svg>
      )}
    </button>
  );
}

