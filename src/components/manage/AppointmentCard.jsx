import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { formatDate, formatTime, formatPrice, generateSlots, groupSlots, toTitleCase } from '../../utils/formatters';
import { useAvailability, useBlockedDates } from '../../hooks/useAvailability';
import { useConfig } from '../../hooks/useConfig';
import { useRescheduleAppointment, useCancelAppointment } from '../../hooks/useAppointment';
import { api } from '../../services/api';
import { useToast } from '../ui/Toast';
import Button from '../ui/Button';
import Spinner from '../ui/Spinner';

const MONTHS_ES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
const DAYS_ES   = ['Do','Lu','Ma','Mi','Ju','Vi','Sá'];

function toDateStr(d) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

export default function AppointmentCard({ appointment, onUpdated }) {
  const toast = useToast();
  const { data: config } = useConfig();
  const timeFmt    = config?.time_format ?? '12h';
  const branches   = config?.branches   ?? [];
  const isMulti    = branches.length > 1;

  const [mode,      setMode]      = useState('view');
  const [reschedStep, setReschedStep] = useState('branch'); // 'branch' | 'specialist' | 'datetime'
  const [reBranch,  setReBranch]  = useState(null);  // selected branch object
  const [reSpecialist, setReSpecialist] = useState(null); // selected specialist object
  const [newDate,   setNewDate]   = useState(null);
  const [newTime,   setNewTime]   = useState(null);
  const [viewMonth, setViewMonth] = useState(() => {
    const t = new Date();
    return new Date(t.getFullYear(), t.getMonth(), 1);
  });

  const effectiveSpecialistId = reSpecialist?.id  || appointment.specialistId;
  const effectiveBranchId     = reBranch?.id      || appointment.branchId;
  const dateStr = newDate ? toDateStr(newDate) : null;

  const { data: availData, isFetching } = useAvailability(
    mode === 'reschedule' && reschedStep === 'datetime' ? dateStr : null,
    effectiveSpecialistId,
    effectiveBranchId,
    appointment.serviceId,
    mode === 'reschedule' ? appointment.code : null,
  );
  const appointmentIntervals = availData?.appointmentIntervals || [];
  const bufferMins    = availData?.config?.bufferMins    || 0;
  const leadMins      = availData?.config?.leadMins      || 0;
  const closeTime     = availData?.config?.closeTime     || '19:00';
  const staffBlocked  = availData?.staffBlocked ?? null;

  // Lead-time cutoff for today's reschedule slots
  const todayStr  = toDateStr(new Date());
  const isToday   = dateStr === todayStr;
  const nowMins   = new Date().getHours() * 60 + new Date().getMinutes();
  const cutoffMins = isToday ? nowMins + leadMins : 0;

  const rescheduleMutation = useRescheduleAppointment();
  const cancelMutation     = useCancelAppointment();
  const isCancelled        = appointment.status === 'cancelled';

  function openReschedule() {
    const initBranch = branches.find(b => b.id === appointment.branchId) || null;
    setReBranch(initBranch);
    setReSpecialist(null);
    setNewDate(null);
    setNewTime(null);
    setViewMonth(() => { const t = new Date(); return new Date(t.getFullYear(), t.getMonth(), 1); });
    setReschedStep(isMulti ? 'branch' : 'specialist');
    setMode('reschedule');
  }

  async function handleReschedule() {
    if (!newDate || !newTime) return;
    try {
      const updated = await rescheduleMutation.mutateAsync({
        code:        appointment.code,
        date:        toDateStr(newDate),
        time:        newTime,
        branchId:    reBranch?.id     ?? undefined,
        specialistId: reSpecialist?.id ?? undefined,
      });
      toast('Cita reagendada correctamente.', 'success');
      setMode('view');
      onUpdated(updated);
    } catch (err) {
      toast(err.message || 'Error al reagendar.', 'error');
    }
  }

  async function handleCancel() {
    try {
      await cancelMutation.mutateAsync(appointment.code);
      toast('Cita cancelada.', 'info');
      onUpdated({ ...appointment, status: 'cancelled' });
      setMode('view');
    } catch (err) {
      toast(err.message || 'Error al cancelar.', 'error');
    }
  }

  return (
    <div className="card p-6 max-w-xl mx-auto animate-fade-up">
      {/* Header */}
      <div className="flex items-start justify-between mb-5">
        <div>
          <div className="flex items-center gap-2.5 mb-1.5">
            <span className="font-display text-xl font-bold text-gold tracking-wider">{appointment.code}</span>
            <StatusBadge status={appointment.status} />
          </div>
          <p className="text-ink-3 text-sm">{toTitleCase(appointment.clientName)} · {appointment.clientPhone}</p>
        </div>
      </div>

      {/* Details */}
      <div className="space-y-2.5 mb-6">
        <DetailRow label="Servicio"     value={`${toTitleCase(appointment.serviceName)} (${appointment.serviceDuration} min)`} />
        <DetailRow label="Precio"       value={formatPrice(appointment.servicePrice)} gold />
        <DetailRow label="Especialista" value={toTitleCase(appointment.specialistName)} />
        {appointment.branchName && <DetailRow label="Sucursal" value={appointment.branchName} />}
        <DetailRow label="Fecha"        value={formatDate(appointment.date)} />
        <DetailRow label="Hora"         value={formatTime(appointment.time, timeFmt)} />
      </div>

      {/* Actions */}
      {!isCancelled && mode === 'view' && (
        <div className="flex gap-3 flex-wrap">
          <Button variant="outline" onClick={openReschedule}>Reagendar</Button>
          <Button variant="danger"  onClick={() => setMode('cancel-confirm')}>Cancelar cita</Button>
        </div>
      )}

      {mode === 'cancel-confirm' && (
        <div className="mt-4 p-4 bg-red-500/6 border border-red-500/25 rounded-xl animate-fade-in">
          <p className="text-sm text-ink mb-1 font-medium">¿Cancelar esta cita?</p>
          <p className="text-xs text-ink-3 mb-4">Esta acción no se puede deshacer.</p>
          <div className="flex gap-3">
            <Button variant="danger" loading={cancelMutation.isPending} onClick={handleCancel}>Sí, cancelar</Button>
            <Button variant="ghost" onClick={() => setMode('view')}>Volver</Button>
          </div>
        </div>
      )}

      {mode === 'reschedule' && (
        <ReschedulePanel
          appointment={appointment}
          config={config}
          branches={branches}
          isMulti={isMulti}
          reschedStep={reschedStep}
          setReschedStep={setReschedStep}
          reBranch={reBranch}     setReBranch={setReBranch}
          reSpecialist={reSpecialist} setReSpecialist={setReSpecialist}
          effectiveSpecialistId={effectiveSpecialistId}
          effectiveBranchId={effectiveBranchId}
          staffBlocked={staffBlocked}
          viewMonth={viewMonth}   setViewMonth={setViewMonth}
          newDate={newDate}       setNewDate={d => { setNewDate(d); setNewTime(null); }}
          newTime={newTime}       setNewTime={setNewTime}
          appointmentIntervals={appointmentIntervals}
          bufferMins={bufferMins} isFetching={isFetching}
          isToday={isToday}
          cutoffMins={cutoffMins}
          onConfirm={handleReschedule}
          onCancel={() => setMode('view')}
          isLoading={rescheduleMutation.isPending}
        />
      )}
    </div>
  );
}

function ReschedulePanel({
  appointment, config, branches, isMulti,
  reschedStep, setReschedStep,
  reBranch, setReBranch, reSpecialist, setReSpecialist,
  effectiveSpecialistId, effectiveBranchId,
  staffBlocked, viewMonth, setViewMonth,
  newDate, setNewDate, newTime, setNewTime,
  appointmentIntervals, bufferMins = 0, isFetching,
  isToday = false, cutoffMins = 0,
  onConfirm, onCancel, isLoading,
}) {
  const maxAdvance   = config?.max_advance_days   ?? 30;
  const intervalMins = config?.slot_interval_mins ?? 30;
  const timeFmt      = config?.time_format        ?? '12h';

  const { data: specialistsData } = useQuery({
    queryKey: ['specialists'],
    queryFn:  () => api.getSpecialists(),
    staleTime: 300_000,
  });
  const allSpecialists = specialistsData?.specialists ?? [];

  // Filter specialists by selected branch (branchIds empty = available everywhere)
  const filteredSpecialists = effectiveBranchId
    ? allSpecialists.filter(s => !s.branchIds?.length || s.branchIds.includes(effectiveBranchId))
    : allSpecialists;

  // Hours for the effective branch
  const hoursByBranch = config?.hours ?? {};
  const bizHoursRaw   = effectiveBranchId
    ? (hoursByBranch[String(effectiveBranchId)] ?? Object.values(hoursByBranch)[0] ?? [])
    : (Array.isArray(hoursByBranch) ? hoursByBranch : Object.values(hoursByBranch)[0] ?? []);
  const bizHours    = bizHoursRaw;
  const daysClosed  = bizHours.filter(h => !h.is_open).map(h => h.day_of_week);

  const monthStr = `${viewMonth.getFullYear()}-${String(viewMonth.getMonth()+1).padStart(2,'0')}`;
  const { data: blockedData } = useBlockedDates(monthStr, effectiveSpecialistId);
  const blockedDates = blockedData?.blockedDates ?? [];

  const today   = new Date(); today.setHours(0, 0, 0, 0);
  const maxDate = new Date(today); maxDate.setDate(maxDate.getDate() + maxAdvance);

  function isDisabled(d) {
    if (d < today || d > maxDate) return true;
    if (daysClosed.includes(d.getDay())) return true;
    const ds = toDateStr(d);
    if (blockedDates.includes(ds)) return true;
    if (blockedDates.includes(`recurring:${d.getDay()}`)) return true;
    return false;
  }

  const firstDay    = viewMonth.getDay();
  const daysInMonth = new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(viewMonth.getFullYear(), viewMonth.getMonth(), d));

  const dayEntry  = newDate ? (bizHours.find(h => h.day_of_week === newDate.getDay()) ?? null) : null;
  const openTime  = dayEntry?.open_time  ?? '9:00';
  const closeTime = dayEntry?.close_time ?? '19:00';
  const allSlots  = newDate ? generateSlots(openTime, closeTime, appointment.serviceDuration, intervalMins, bufferMins) : [];
  const grouped   = groupSlots(allSlots);

  // Stepper labels
  const steps = [
    ...(isMulti ? [{ key: 'branch', label: 'Sucursal' }] : []),
    { key: 'specialist', label: 'Especialista' },
    { key: 'datetime', label: 'Fecha y hora' },
  ];

  return (
    <div className="mt-5 border-t border-edge pt-5 animate-fade-in">
      {/* Step indicator */}
      <div className="flex items-center gap-2 mb-5">
        {steps.map((s, i) => {
          const idx     = steps.findIndex(x => x.key === reschedStep);
          const stepIdx = i;
          const done    = stepIdx < idx;
          const active  = s.key === reschedStep;
          return (
            <div key={s.key} className="flex items-center gap-2">
              {i > 0 && <div className="w-5 h-px bg-edge" />}
              <button
                onClick={() => done && setReschedStep(s.key)}
                className={[
                  'flex items-center gap-1.5 text-[11px] font-semibold transition-colors',
                  active ? 'text-ink' : done ? 'text-gold cursor-pointer' : 'text-ink-3 cursor-default',
                ].join(' ')}
              >
                <span className={[
                  'w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold',
                  active ? 'bg-ink text-card' : done ? 'bg-gold text-on-gold' : 'bg-raised text-ink-3 border border-edge',
                ].join(' ')}>
                  {done ? '✓' : i + 1}
                </span>
                {s.label}
              </button>
            </div>
          );
        })}
      </div>

      {/* Step: Branch */}
      {reschedStep === 'branch' && (
        <div className="space-y-3">
          <p className="text-sm font-medium text-ink">¿En qué sucursal deseas tu cita?</p>
          <div className="grid grid-cols-1 gap-2">
            {branches.map(b => (
              <button
                key={b.id}
                onClick={() => {
                  setReBranch(b);
                  setReSpecialist(null);
                  setNewDate(null); setNewTime(null);
                  setReschedStep('specialist');
                }}
                className={[
                  'flex items-center gap-3 p-3.5 rounded-xl border text-left transition-all',
                  reBranch?.id === b.id
                    ? 'border-gold bg-gold/6 shadow-xs'
                    : 'border-edge bg-card hover:border-gold/40 hover:bg-raised',
                ].join(' ')}
              >
                <div className="w-8 h-8 rounded-lg bg-gold/10 flex items-center justify-center shrink-0">
                  <svg className="w-4 h-4 text-gold" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0118 0z"/>
                    <circle cx="12" cy="10" r="3"/>
                  </svg>
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-ink truncate">{b.name}</p>
                  {b.address && <p className="text-xs text-ink-3 truncate">{b.address}</p>}
                </div>
              </button>
            ))}
          </div>
          <Button variant="ghost" onClick={onCancel}>Cancelar</Button>
        </div>
      )}

      {/* Step: Specialist */}
      {reschedStep === 'specialist' && (
        <div className="space-y-3">
          <p className="text-sm font-medium text-ink">¿Con quién deseas tu cita?</p>
          <div className="grid grid-cols-1 gap-2">
            {filteredSpecialists.map(s => (
              <button
                key={s.id}
                onClick={() => {
                  setReSpecialist(s);
                  setNewDate(null); setNewTime(null);
                  setReschedStep('datetime');
                }}
                className={[
                  'flex items-center gap-3 p-3.5 rounded-xl border text-left transition-all',
                  reSpecialist?.id === s.id
                    ? 'border-gold bg-gold/6 shadow-xs'
                    : 'border-edge bg-card hover:border-gold/40 hover:bg-raised',
                ].join(' ')}
              >
                <div className="w-9 h-9 rounded-full bg-raised border border-edge flex items-center justify-center shrink-0">
                  {s.avatarUrl
                    ? <img src={s.avatarUrl} alt={s.name} className="w-9 h-9 rounded-full object-cover" />
                    : <span className="text-xs font-bold text-ink-3">{s.initials}</span>
                  }
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-ink truncate">{toTitleCase(s.name)}</p>
                  {s.specialty && <p className="text-xs text-ink-3 truncate">{s.specialty}</p>}
                </div>
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            {isMulti && (
              <Button variant="ghost" onClick={() => setReschedStep('branch')}>Atrás</Button>
            )}
            <Button variant="ghost" onClick={onCancel}>Cancelar</Button>
          </div>
        </div>
      )}

      {/* Step: Date + Time */}
      {reschedStep === 'datetime' && (
        <div className="space-y-4">
          <p className="text-sm font-medium text-ink">Selecciona nueva fecha y hora</p>

          {/* Summary pills */}
          {(reBranch || reSpecialist) && (
            <div className="flex flex-wrap gap-2">
              {reBranch && (
                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-ink-2 bg-raised border border-edge px-2.5 py-1 rounded-full">
                  <svg className="w-3 h-3 text-gold" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/>
                  </svg>
                  {reBranch.name}
                </span>
              )}
              {reSpecialist && (
                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-ink-2 bg-raised border border-edge px-2.5 py-1 rounded-full">
                  <svg className="w-3 h-3 text-gold" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/>
                  </svg>
                  {toTitleCase(reSpecialist.name)}
                </span>
              )}
            </div>
          )}

          {/* Mini calendar */}
          <div className="card p-4">
            <div className="flex items-center justify-between mb-3">
              <button
                onClick={() => setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth()-1, 1))}
                className="w-7 h-7 flex items-center justify-center rounded-lg text-ink-3 hover:text-ink hover:bg-raised transition-all cursor-pointer"
                aria-label="Mes anterior"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <span className="text-xs font-semibold text-ink capitalize">
                {MONTHS_ES[viewMonth.getMonth()]} {viewMonth.getFullYear()}
              </span>
              <button
                onClick={() => setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth()+1, 1))}
                className="w-7 h-7 flex items-center justify-center rounded-lg text-ink-3 hover:text-ink hover:bg-raised transition-all cursor-pointer"
                aria-label="Mes siguiente"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
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
                const isToday  = toDateStr(date) === toDateStr(today);
                const isSel    = newDate && toDateStr(date) === toDateStr(newDate);
                return (
                  <button
                    key={toDateStr(date)}
                    disabled={disabled}
                    onClick={() => setNewDate(date)}
                    className={[
                      'relative h-8 text-xs rounded-lg font-medium transition-all duration-160',
                      disabled  ? 'text-ink-3/30 cursor-not-allowed' : 'cursor-pointer',
                      isSel     ? 'bg-gold text-on-gold shadow-xs' : '',
                      !isSel && isToday && !disabled ? 'text-gold font-semibold' : '',
                      !isSel && !disabled ? 'hover:bg-raised text-ink' : '',
                    ].join(' ')}
                  >
                    {date.getDate()}
                    {isToday && !isSel && (
                      <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-gold" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Time slots */}
          {newDate && (
            isFetching ? (
              <div className="flex justify-center py-6"><Spinner size="sm" /></div>
            ) : staffBlocked ? (
              <div className="flex flex-col items-center gap-2 py-5 text-center rounded-xl bg-raised border border-edge">
                <svg className="w-5 h-5 text-ink-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                </svg>
                <div>
                  <p className="text-sm font-medium text-ink">Día no disponible</p>
                  <p className="text-xs text-ink-3 mt-0.5">
                    {staffBlocked.reason || 'El especialista no estará disponible este día.'}
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {Object.entries({ morning: 'Mañana', afternoon: 'Tarde', evening: 'Noche' }).map(([key, label]) => {
                  const slots = grouped[key];
                  if (!slots?.length) return null;
                  const [cH, cM] = closeTime.split(':').map(Number);
                  const closeMins = cH * 60 + cM;
                  return (
                    <div key={key}>
                      <p className="label-section mb-2">{label}</p>
                      <div className="grid grid-cols-4 gap-1.5">
                        {slots.map(slot => {
                          const [sh, sm] = slot.split(':').map(Number);
                          const slotStart = sh * 60 + sm;
                          const slotEnd   = slotStart + appointment.serviceDuration;
                          // Lead-time: disable slots too close to now when rescheduling today
                          const isPast = isToday && slotStart <= cutoffMins;
                          const busy = isPast
                            || slotEnd > closeMins
                            || appointmentIntervals.some(
                              ({ startMin, endMin }) => slotStart < endMin && slotEnd > startMin
                            );
                          const sel = newTime === slot;
                          return (
                            <button
                              key={slot}
                              disabled={busy}
                              onClick={() => setNewTime(slot)}
                              className={[
                                'py-2 rounded-xl text-xs font-medium transition-all duration-160',
                                busy ? 'text-ink-3/40 line-through cursor-not-allowed bg-raised/50' : 'cursor-pointer',
                                sel  ? 'bg-gold text-on-gold shadow-xs'
                                     : !busy ? 'bg-raised text-ink-2 hover:bg-edge hover:text-ink active:scale-[0.97]' : '',
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

          <div className="flex gap-3 pt-1">
            <Button onClick={onConfirm} disabled={!newDate || !newTime} loading={isLoading}>
              Confirmar reagendo
            </Button>
            <Button variant="ghost" onClick={() => setReschedStep('specialist')}>Atrás</Button>
            <Button variant="ghost" onClick={onCancel}>Cancelar</Button>
          </div>
        </div>
      )}
    </div>
  );
}

function DetailRow({ label, value, gold }) {
  return (
    <div className="flex justify-between items-center gap-4">
      <span className="text-sm text-ink-3 shrink-0">{label}</span>
      <span className={`text-sm font-medium text-right ${gold ? 'text-gold' : 'text-ink'}`}>{value}</span>
    </div>
  );
}

function StatusBadge({ status }) {
  const cls    = { confirmed: 'badge badge-confirmed', cancelled: 'badge badge-cancelled', rescheduled: 'badge badge-rescheduled' };
  const labels = { confirmed: 'Confirmada', cancelled: 'Cancelada', rescheduled: 'Reagendada' };
  return <span className={cls[status] || 'badge'}>{labels[status] || status}</span>;
}
