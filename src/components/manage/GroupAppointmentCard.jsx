import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { formatDate, formatTime, formatPrice, toTitleCase } from '../../utils/formatters';
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

const MONTHS_ES   = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
const MONTH_SHORT = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
const DAYS_ES     = ['Do','Lu','Ma','Mi','Ju','Vi','Sá'];

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
  const timeFmt  = config?.time_format ?? '12h';
  const branches = config?.branches   ?? [];

  const allCancelled = group.appointments?.every(a => a.status === 'cancelled');
  const status       = allCancelled ? 'cancelled' : group.status;
  const isCancelled  = status === 'cancelled';
  const todayStr     = toDateStr(new Date());
  const isPast       = !!group.date && group.date < todayStr;

  // Date box values
  const apptDate  = new Date(group.date + 'T12:00:00');
  const monthAbbr = MONTH_SHORT[apptDate.getMonth()];
  const dayNum    = group.date?.split('-')[2];

  // Overall start time = first appointment's time
  const startTime = group.appointments?.[0]?.time ?? null;

  // Branch info
  const groupBranchId   = group.appointments?.[0]?.branchId ?? null;
  const groupBranch     = branches.find(b => String(b.id) === String(groupBranchId));
  const groupBranchName = group.appointments?.[0]?.branchName ?? groupBranch?.name ?? null;

  const { data: specialistsData } = useQuery({
    queryKey: ['specialists'],
    queryFn:  () => api.getSpecialists(),
    staleTime: 300_000,
  });
  const allSpecialists = specialistsData?.specialists ?? [];

  const [mode, setMode]    = useState('view'); // 'view' | 'cancel-confirm' | 'reschedule'
  const cancelMutation     = useCancelGroupAppointment();

  async function handleCancel() {
    try {
      const updated = await cancelMutation.mutateAsync(group.groupCode);
      setMode('view');
      onUpdated?.(updated);
      toast('Visita cancelada.', 'info');
    } catch (err) {
      toast(err.message || 'Error al cancelar.', 'error');
    }
  }

  return (
    <div className="max-w-xl mx-auto animate-fade-up space-y-3">
      <div className="card overflow-hidden">

        {/* Status accent line */}
        <div className={`h-[3px] ${
          status === 'cancelled'   ? 'bg-red-500/80' :
          status === 'rescheduled' ? 'bg-amber-500/80' :
          'bg-gold'
        }`} />

        {/* Code + client | StatusBadge */}
        <div className="px-6 pt-5 pb-4 flex items-start justify-between gap-3 border-b border-edge">
          <div className="min-w-0">
            <p className="font-mono text-[22px] font-bold text-gold tracking-[0.18em] leading-tight">
              {group.groupCode}
            </p>
            <p className="text-xs text-ink-3 mt-0.5 truncate">
              {toTitleCase(group.clientName)} · {group.clientPhone}
            </p>
          </div>
          <StatusBadge status={status} />
        </div>

        {/* Date + Time */}
        <div className="px-6 py-4 flex items-center gap-4 border-b border-edge">
          <div className="w-12 h-12 rounded-2xl bg-gold/8 border border-gold/20 flex flex-col items-center justify-center shrink-0">
            <span className="text-[9px] font-bold uppercase tracking-widest text-gold leading-none">{monthAbbr}</span>
            <span className="text-[22px] font-bold text-gold leading-tight tabular-nums">{dayNum}</span>
          </div>
          <div className="flex-1">
            <p className="text-[14px] font-semibold text-ink leading-snug">{formatDate(group.date)}</p>
            {startTime && (
              <p className="text-[22px] font-bold text-gold tabular-nums leading-tight">
                {formatTime(startTime, timeFmt)}
              </p>
            )}
          </div>
          <div className="text-right shrink-0">
            <p className="text-xs text-ink-3 tabular-nums">{group.totalDuration} min</p>
            <p className="text-xs text-ink-3">
              {group.appointments?.length} {group.appointments?.length === 1 ? 'servicio' : 'servicios'}
            </p>
          </div>
        </div>

        {/* Appointments / Services list */}
        <div className="px-6 py-4 border-b border-edge">
          <p className="label-section mb-3">Servicios</p>
          <div className="space-y-2.5">
            {(group.appointments ?? []).map((appt) => {
              const specialist = allSpecialists.find(s => String(s.id) === String(appt.specialistId));
              return (
                <div key={appt.code} className="flex items-start gap-3">
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
                    <p className="text-[11px] text-ink-3 mt-0.5 leading-snug">
                      {toTitleCase(appt.specialistName)}
                      {' · '}
                      <span className="text-gold font-medium">{formatTime(appt.time, timeFmt)}</span>
                      {' · '}{appt.serviceDuration} min
                    </p>
                    {appt.status === 'cancelled' && (
                      <span className="badge badge-cancelled text-[10px] mt-1 inline-block">Cancelada</span>
                    )}
                  </div>
                  <p className="text-[13px] font-semibold text-gold tabular-nums shrink-0">
                    {appt.priceType === 'ask' ? 'A consultar' : formatPrice(appt.servicePrice)}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Branch */}
        {groupBranchName && (
          <div className="px-6 py-4 border-b border-edge">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full border border-edge bg-raised flex items-center justify-center shrink-0 overflow-hidden">
                {groupBranch?.image_url
                  ? <img src={groupBranch.image_url} alt={groupBranchName} className="w-full h-full object-cover" />
                  : <svg className="w-4 h-4 text-ink-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0118 0z"/>
                      <circle cx="12" cy="10" r="3"/>
                    </svg>
                }
              </div>
              <div>
                <p className="label-section">Sucursal</p>
                <p className="text-[14px] font-semibold text-ink mt-0.5">{groupBranchName}</p>
              </div>
            </div>
          </div>
        )}

        {/* Total */}
        <div className="px-6 py-3.5 border-b border-edge flex items-center justify-between bg-raised/30">
          <span className="text-[13px] font-semibold text-ink">Total</span>
          <span className="text-[18px] font-bold text-gold tabular-nums">
            {(group.appointments ?? []).some(a => a.priceType === 'ask')
              ? (group.totalPrice > 0 ? `${formatPrice(group.totalPrice)}+` : 'A consultar')
              : formatPrice(group.totalPrice)}
          </span>
        </div>

        {/* Reagendada banner */}
        {status === 'rescheduled' && group.previousDate && (
          <div className="mx-4 mt-3 mb-1 flex items-start gap-2 px-3.5 py-2.5 rounded-xl bg-amber-500/6 border border-amber-500/20">
            <svg className="w-3.5 h-3.5 text-amber-500 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
            </svg>
            <p className="text-xs leading-relaxed text-amber-700 dark:text-amber-400">
              <span className="font-semibold">Reagendada.</span>{' '}
              Antes:{' '}
              <span className="line-through">
                {formatDate(group.previousDate)}
                {group.previousTime && ` · ${formatTime(group.previousTime, timeFmt)}`}
              </span>
            </p>
          </div>
        )}

        {/* Cancelled notice */}
        {isCancelled && (
          <div className="mx-4 mb-4 mt-3 flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-red-500/6 border border-red-500/20 text-xs text-red-500">
            <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/>
            </svg>
            Esta visita fue cancelada.
          </div>
        )}

        {/* Actions — view mode */}
        {!isCancelled && mode === 'view' && (
          <div className="px-6 pt-4 pb-6">
            {isPast && (
              <div className="flex items-center gap-2 px-3.5 py-2.5 mb-3 rounded-xl bg-ink/4 border border-edge text-xs text-ink-3">
                <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
                Esta visita ya ocurrió. Solo puedes cancelarla.
              </div>
            )}
            <div className="flex gap-2.5">
              <Button variant="outline" onClick={() => setMode('reschedule')} disabled={isPast} className="flex-1">
                Reagendar
              </Button>
              <Button variant="danger" onClick={() => setMode('cancel-confirm')} className="flex-1">
                Cancelar visita
              </Button>
            </div>
          </div>
        )}

        {/* Cancel confirm */}
        {mode === 'cancel-confirm' && (
          <div className="px-6 pt-4 pb-6">
            <div className="p-4 bg-red-500/6 border border-red-500/20 rounded-2xl animate-fade-in">
              <p className="text-[14px] font-semibold text-ink mb-0.5">¿Cancelar esta visita?</p>
              <p className="text-xs text-ink-3 mb-4">Se cancelarán todos los servicios del grupo. Esta acción no se puede deshacer.</p>
              <div className="flex gap-2.5">
                <Button variant="danger" loading={cancelMutation.isPending} onClick={handleCancel}>
                  Sí, cancelar
                </Button>
                <Button variant="ghost" onClick={() => setMode('view')}>Volver</Button>
              </div>
            </div>
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
            toast('Visita reagendada correctamente.', 'success');
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

  const groupedSlots = { morning: [], afternoon: [], evening: [] };
  for (const s of availableSlots) {
    const [h] = s.split(':').map(Number);
    if (h < 12) groupedSlots.morning.push(s);
    else if (h < 18) groupedSlots.afternoon.push(s);
    else groupedSlots.evening.push(s);
  }

  const cronograma = newTime ? (() => {
    const [bH, bM] = newTime.split(':').map(Number);
    let offset = 0;
    return (group.appointments ?? []).map(appt => {
      const start = bH * 60 + bM + offset;
      offset += appt.serviceDuration;
      return { ...appt, startStr: minsToStr(start), endStr: minsToStr(start + appt.serviceDuration) };
    });
  })() : null;

  // Specialists for cronograma avatars
  const { data: specialistsData } = useQuery({
    queryKey: ['specialists'],
    queryFn:  () => api.getSpecialists(),
    staleTime: 300_000,
  });
  const allSpecialists = specialistsData?.specialists ?? [];

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
        <h3 className="text-[15px] font-semibold text-ink">Reagendar visita</h3>
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
            <p className="label-section mb-3">Cronograma</p>
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
          <Button variant="ghost" onClick={onCancel}>Volver</Button>
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
