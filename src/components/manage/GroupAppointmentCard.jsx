import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { formatDate, formatTime, formatPrice, formatServicePrice, toTitleCase } from '../../utils/formatters';
import { useGroupAvailability, useBlockedDates } from '../../hooks/useAvailability';
import { useConfig } from '../../hooks/useConfig';
import { useRescheduleGroupAppointment, useCancelGroupAppointment } from '../../hooks/useAppointment';
import { useToast } from '../ui/Toast';
import { api } from '../../services/api';
import Button from '../ui/Button';
import Spinner from '../ui/Spinner';

function initials(name) {
  return (name || '').split(' ').filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join('') || '?';
}

const MONTHS_ES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
const DAYS_ES   = ['Do','Lu','Ma','Mi','Ju','Vi','Sá'];

function toDateStr(d) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}
function minsToStr(m) {
  const h = Math.floor(m / 60); const min = m % 60;
  return `${String(h).padStart(2,'0')}:${String(min).padStart(2,'0')}`;
}

export default function GroupAppointmentCard({ group, onUpdated }) {
  const toast            = useToast();
  const { data: config } = useConfig();
  const timeFmt = config?.time_format ?? '12h';

  const allCancelled = group.appointments?.every(a => a.status === 'cancelled');
  const status       = allCancelled ? 'cancelled' : group.status;
  const isCancelled  = status === 'cancelled';
  const todayStr     = toDateStr(new Date());
  const isPast       = !!group.date && group.date < todayStr;

  const { data: specialistsData } = useQuery({
    queryKey: ['specialists'],
    queryFn:  () => api.getSpecialists(),
    staleTime: 300_000,
  });
  const allSpecialists = specialistsData?.specialists ?? [];

  const [mode,          setMode]          = useState('view');
  const [confirmCancel, setConfirmCancel] = useState(false);
  const cancelMutation = useCancelGroupAppointment();

  return (
    <div className="max-w-xl mx-auto animate-fade-up space-y-3">
      <div className="card overflow-hidden">

        {/* Status accent line */}
        <div className={`h-[3px] ${
          status === 'cancelled'   ? 'bg-red-500/80' :
          status === 'rescheduled' ? 'bg-amber-500/80' :
          'bg-gold'
        }`} />

        {/* Header */}
        <div className="px-6 pt-5 pb-4 flex items-start justify-between gap-3 border-b border-edge">
          <div className="min-w-0">
            <div className="flex items-center gap-2.5 mb-1">
              <p className="font-mono text-[22px] font-bold text-gold tracking-[0.18em] leading-tight">
                {group.groupCode}
              </p>
              <StatusBadge status={status} />
            </div>
            <p className="text-xs text-ink-3 truncate">
              {toTitleCase(group.clientName)} · {group.clientPhone}
            </p>
          </div>
          <div className="text-right shrink-0">
            <p className="text-[10px] text-ink-3 uppercase tracking-wider font-medium">Total</p>
            <p className="text-base font-bold text-gold tabular-nums">
              {(group.appointments ?? []).some(a => a.priceType === 'ask')
                ? (group.totalPrice > 0 ? `${formatPrice(group.totalPrice)}+` : 'A consultar')
                : formatPrice(group.totalPrice)}
            </p>
          </div>
        </div>

        {/* Date */}
        <div className="px-6 py-4 border-b border-edge">
          <div className="flex items-center gap-2 text-sm">
            <svg className="w-4 h-4 text-gold shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
              <rect x="3" y="4" width="18" height="18" rx="2"/>
              <line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/>
              <line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
            <span className="font-semibold text-ink">{formatDate(group.date)}</span>
            <span className="text-ink-3 text-xs ml-auto">
              {group.totalDuration} min · {group.appointments?.length} servicios
            </span>
          </div>
        </div>

        {/* Appointments list */}
        <div className="px-6 py-4 space-y-2.5 border-b border-edge">
          {(group.appointments ?? []).map((appt) => {
            const specialist = allSpecialists.find(s => String(s.id) === String(appt.specialistId));
            return (
              <div key={appt.code} className="flex items-start gap-3 p-3 rounded-xl border border-edge bg-raised/40">
                <div className="w-9 h-9 rounded-full border-2 border-gold/20 bg-gold/8 flex items-center justify-center shrink-0 overflow-hidden mt-0.5">
                  {specialist?.avatarUrl
                    ? <img src={specialist.avatarUrl} alt={appt.specialistName} className="w-full h-full object-cover" />
                    : <span className="text-[11px] font-bold text-gold">{initials(appt.specialistName)}</span>
                  }
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-semibold text-ink leading-snug">
                    {toTitleCase(appt.serviceName)}
                  </p>
                  <p className="text-[11px] text-ink-3 mt-0.5">{toTitleCase(appt.specialistName)}</p>
                  <div className="flex items-center gap-2.5 mt-1.5">
                    <span className="text-[11px] text-ink-2 font-medium">{formatTime(appt.time, timeFmt)}</span>
                    <span className="w-0.5 h-0.5 rounded-full bg-ink-3/50" />
                    <span className="text-[10px] text-ink-3">{appt.serviceDuration} min</span>
                    <span className="w-0.5 h-0.5 rounded-full bg-ink-3/50" />
                    <span className="text-[11px] text-gold font-medium tabular-nums">
                      {appt.priceType === 'ask' ? 'A consultar' : formatPrice(appt.servicePrice)}
                    </span>
                    {appt.status === 'cancelled' && (
                      <span className="badge badge-cancelled text-[10px]">Cancelada</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Reagendada banner */}
        {status === 'rescheduled' && group.previousDate && (
          <div className="mx-4 mt-3 mb-1 flex items-start gap-2 px-3.5 py-2.5 rounded-xl bg-amber-500/6 border border-amber-500/20">
            <svg className="w-3.5 h-3.5 text-amber-500 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
            </svg>
            <p className="text-xs leading-relaxed text-amber-700 dark:text-amber-400">
              <span className="font-semibold">Reagendada.</span>{' '}
              Antes: <span className="line-through">{formatDate(group.previousDate)}</span>
            </p>
          </div>
        )}

        {/* Cancelled notice */}
        {isCancelled && (
          <div className="mx-4 mb-4 mt-2 flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-red-500/6 border border-red-500/20 text-xs text-red-500">
            <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/>
            </svg>
            Este grupo de citas fue cancelado.
          </div>
        )}

        {/* Actions */}
        {!isCancelled && mode === 'view' && (
          <div className="px-6 pb-6 pt-3 space-y-2.5">
            {isPast ? (
              <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-ink/4 border border-edge text-xs text-ink-3">
                <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
                Este grupo ya ocurrió.
              </div>
            ) : (
              <>
                <Button onClick={() => setMode('reschedule')} className="w-full">
                  Reagendar grupo
                </Button>
                {!confirmCancel ? (
                  <button
                    onClick={() => setConfirmCancel(true)}
                    className="w-full py-2.5 rounded-xl text-xs font-medium text-red-500 hover:bg-red-500/6 border border-transparent hover:border-red-500/20 transition-all cursor-pointer"
                  >
                    Cancelar reservación
                  </button>
                ) : (
                  <div className="rounded-xl border border-red-500/25 bg-red-500/5 px-4 py-3.5 space-y-3">
                    <p className="text-xs text-ink-2 leading-relaxed">
                      ¿Cancelar todos los servicios de este grupo? Esta acción no se puede deshacer.
                    </p>
                    <div className="flex gap-2">
                      <Button
                        variant="danger"
                        size="sm"
                        loading={cancelMutation.isPending}
                        onClick={async () => {
                          try {
                            const updated = await cancelMutation.mutateAsync(group.groupCode);
                            setConfirmCancel(false);
                            onUpdated?.(updated);
                            toast('Reservación cancelada.', 'success');
                          } catch (err) {
                            toast(err.message || 'Error al cancelar.', 'error');
                          }
                        }}
                        className="flex-1"
                      >
                        Sí, cancelar
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={cancelMutation.isPending}
                        onClick={() => setConfirmCancel(false)}
                        className="flex-1"
                      >
                        No, volver
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {/* Reschedule panel */}
      {mode === 'reschedule' && (
        <GroupReschedulePanel
          group={group}
          config={config}
          timeFmt={timeFmt}
          onCancel={() => setMode('view')}
          onSuccess={updated => {
            setMode('view');
            onUpdated?.(updated);
            toast('Grupo reagendado correctamente.', 'success');
          }}
        />
      )}
    </div>
  );
}

// ── GroupReschedulePanel ───────────────────────────────────────────────────────

function GroupReschedulePanel({ group, config, timeFmt, onCancel, onSuccess }) {
  const toast        = useToast();
  const maxAdvance   = config?.max_advance_days ?? 30;
  const hoursByBranch = config?.hours ?? {};

  const branchId = group.appointments?.[0]?.branchId ?? null;
  const bizHoursRaw = branchId
    ? (hoursByBranch[String(branchId)] ?? Object.values(hoursByBranch)[0] ?? [])
    : (Array.isArray(hoursByBranch) ? hoursByBranch : Object.values(hoursByBranch)[0] ?? []);
  const daysClosed = bizHoursRaw.filter(h => !h.is_open).map(h => h.day_of_week);

  // Build assignments array for group availability query
  const assignments = (group.appointments ?? []).map(a => ({
    serviceId:    a.serviceId,
    specialistId: a.specialistId,
  }));

  const [newDate,   setNewDate]   = useState(null);
  const [newTime,   setNewTime]   = useState(null);
  const [viewMonth, setViewMonth] = useState(() => {
    const t = new Date();
    return new Date(t.getFullYear(), t.getMonth(), 1);
  });

  const dateStr = newDate ? toDateStr(newDate) : null;

  const { data: availData, isFetching } = useGroupAvailability(dateStr, assignments, branchId);
  const availableSlots = availData?.availableSlots ?? [];
  const totalDuration  = availData?.totalDuration  ?? group.totalDuration;

  const monthStr = `${viewMonth.getFullYear()}-${String(viewMonth.getMonth()+1).padStart(2,'0')}`;
  const { data: blockedData } = useBlockedDates(monthStr, assignments[0]?.specialistId ?? null);
  const blockedDates = blockedData?.blockedDates ?? [];

  const rescheduleMutation = useRescheduleGroupAppointment();

  const today   = new Date(); today.setHours(0,0,0,0);
  const maxDate = new Date(today); maxDate.setDate(maxDate.getDate() + maxAdvance);
  const todayStr = toDateStr(today);

  function isDisabled(d) {
    if (d < today || d > maxDate) return true;
    if (daysClosed.includes(d.getDay())) return true;
    const ds = toDateStr(d);
    if (blockedDates.includes(ds)) return true;
    if (blockedDates.includes(`recurring:${d.getDay()}`)) return true;
    return false;
  }

  const firstDay    = viewMonth.getDay();
  const daysInMonth = new Date(viewMonth.getFullYear(), viewMonth.getMonth()+1, 0).getDate();
  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(viewMonth.getFullYear(), viewMonth.getMonth(), d));

  // Group slots by period
  const groupedSlots = { morning: [], afternoon: [], evening: [] };
  for (const s of availableSlots) {
    const [h] = s.split(':').map(Number);
    if (h < 12) groupedSlots.morning.push(s);
    else if (h < 18) groupedSlots.afternoon.push(s);
    else groupedSlots.evening.push(s);
  }

  // Cronograma breakdown when slot is selected
  const cronograma = newTime ? (() => {
    const [bH, bM] = newTime.split(':').map(Number);
    let offset = 0;
    return (group.appointments ?? []).map(appt => {
      const start = bH * 60 + bM + offset;
      offset += appt.serviceDuration;
      return { ...appt, startStr: minsToStr(start), endStr: minsToStr(start + appt.serviceDuration) };
    });
  })() : null;

  async function handleConfirm() {
    if (!newDate || !newTime) return;
    try {
      const updated = await rescheduleMutation.mutateAsync({
        code: group.groupCode,
        date: toDateStr(newDate),
        time: newTime,
      });
      onSuccess(updated);
    } catch (err) {
      toast(err.message || 'Error al reagendar.', 'error');
    }
  }

  return (
    <div className="card p-5 animate-fade-in">
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-[15px] font-semibold text-ink">Reagendar grupo</h3>
        <button
          onClick={onCancel}
          className="w-7 h-7 flex items-center justify-center rounded-lg text-ink-3 hover:text-ink hover:bg-raised transition-all cursor-pointer"
          aria-label="Cerrar"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/>
          </svg>
        </button>
      </div>

      <div className="space-y-4">
        {/* Mini calendar */}
        <div className="card p-4">
          <div className="flex items-center justify-between mb-3">
            <button
              onClick={() => setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth()-1, 1))}
              className="w-7 h-7 flex items-center justify-center rounded-lg text-ink-3 hover:text-ink hover:bg-raised transition-all cursor-pointer"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7"/>
              </svg>
            </button>
            <span className="text-xs font-semibold text-ink capitalize">
              {MONTHS_ES[viewMonth.getMonth()]} {viewMonth.getFullYear()}
            </span>
            <button
              onClick={() => setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth()+1, 1))}
              className="w-7 h-7 flex items-center justify-center rounded-lg text-ink-3 hover:text-ink hover:bg-raised transition-all cursor-pointer"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7"/>
              </svg>
            </button>
          </div>
          <div className="grid grid-cols-7 mb-1.5">
            {DAYS_ES.map(d => (
              <div key={d} className="text-center text-[0.625rem] font-medium text-ink-3 py-0.5">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-y-0.5">
            {cells.map((date, i) => {
              if (!date) return <div key={`e-${i}`} />;
              const disabled = isDisabled(date);
              const isT      = toDateStr(date) === todayStr;
              const isSel    = newDate && toDateStr(date) === toDateStr(newDate);
              return (
                <button
                  key={toDateStr(date)}
                  disabled={disabled}
                  onClick={() => { setNewDate(date); setNewTime(null); }}
                  className={[
                    'relative h-8 text-xs rounded-lg font-medium transition-all duration-160',
                    disabled ? 'text-ink-3/30 cursor-not-allowed' : 'cursor-pointer',
                    isSel ? 'bg-gold text-on-gold shadow-xs' : '',
                    !isSel && isT && !disabled ? 'text-gold font-semibold' : '',
                    !isSel && !disabled ? 'hover:bg-raised text-ink' : '',
                  ].join(' ')}
                >
                  {date.getDate()}
                  {isT && !isSel && (
                    <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-gold" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Available slots */}
        {newDate && (
          isFetching ? (
            <div className="flex justify-center py-6"><Spinner size="sm" /></div>
          ) : availableSlots.length === 0 ? (
            <div className="flex items-center justify-center gap-2 py-5 rounded-xl bg-raised border border-edge">
              <p className="text-xs text-ink-3">Sin horarios disponibles. Elige otro día.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {[['morning','Mañana'], ['afternoon','Tarde'], ['evening','Noche']].map(([key, label]) => {
                const slots = groupedSlots[key];
                if (!slots?.length) return null;
                return (
                  <div key={key}>
                    <p className="label-section mb-2">{label}</p>
                    <div className="grid grid-cols-4 gap-1.5">
                      {slots.map(slot => {
                        const sel = newTime === slot;
                        return (
                          <button
                            key={slot}
                            onClick={() => setNewTime(slot)}
                            className={[
                              'py-2 rounded-xl text-xs font-medium transition-all duration-160 cursor-pointer',
                              sel ? 'bg-gold text-on-gold shadow-xs'
                                  : 'bg-raised text-ink-2 hover:bg-edge hover:text-ink active:scale-[0.97]',
                            ].join(' ')}
                          >
                            {formatTime(slot, timeFmt)}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )
        )}

        {/* Cronograma breakdown */}
        {cronograma && (
          <div className="bg-raised rounded-xl border border-edge px-4 py-3.5">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-ink-3 mb-3">Cronograma</p>
            <div className="space-y-2">
              {cronograma.map((appt, i) => {
                const specialist = allSpecialists.find(s => String(s.id) === String(appt.specialistId));
                return (
                  <div key={appt.code} className="flex items-center gap-3">
                    <div className="flex flex-col items-center self-stretch">
                      <div className="w-2 h-2 rounded-full bg-gold border-2 border-card mt-1 shrink-0" />
                      {i < cronograma.length - 1 && <div className="w-px flex-1 bg-gold/30 my-0.5" />}
                    </div>
                    <div className="flex-1 pb-2">
                      <div className="flex items-center gap-2.5 justify-between">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="w-7 h-7 rounded-full border border-gold/20 bg-gold/8 flex items-center justify-center shrink-0 overflow-hidden">
                            {specialist?.avatarUrl
                              ? <img src={specialist.avatarUrl} alt={appt.specialistName} className="w-full h-full object-cover" />
                              : <span className="text-[9px] font-bold text-gold">{initials(appt.specialistName)}</span>
                            }
                          </div>
                          <div className="min-w-0">
                            <p className="text-[12px] font-semibold text-ink leading-snug truncate">
                              {toTitleCase(appt.serviceName)}
                            </p>
                            <p className="text-[10px] text-ink-3 truncate">{toTitleCase(appt.specialistName)}</p>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-[11px] font-bold text-gold tabular-nums">
                            {formatTime(appt.startStr, timeFmt)}
                          </p>
                          <p className="text-[10px] text-ink-3">{appt.serviceDuration} min</p>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="pt-2.5 border-t border-edge flex justify-between text-xs">
              <span className="text-ink-3">Total</span>
              <span className="font-semibold text-ink tabular-nums">
                {totalDuration} min · {(group.appointments ?? []).some(a => a.priceType === 'ask')
                  ? (group.totalPrice > 0 ? `${formatPrice(group.totalPrice)}+` : 'A consultar')
                  : formatPrice(group.totalPrice)}
              </span>
            </div>
          </div>
        )}

        <div className="flex gap-2.5 pt-1">
          <Button
            onClick={handleConfirm}
            disabled={!newDate || !newTime}
            loading={rescheduleMutation.isPending}
          >
            Confirmar nuevo horario
          </Button>
          <Button variant="ghost" onClick={onCancel}>Cancelar</Button>
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }) {
  const cls    = { confirmed: 'badge badge-confirmed', cancelled: 'badge badge-cancelled', rescheduled: 'badge badge-rescheduled' };
  const labels = { confirmed: 'Confirmada', cancelled: 'Cancelada', rescheduled: 'Reagendada' };
  return <span className={cls[status] || 'badge'}>{labels[status] || status}</span>;
}
