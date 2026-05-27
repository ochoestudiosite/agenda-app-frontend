import { useState } from 'react';
import { formatDate, formatTime, formatPrice, generateSlots, groupSlots, toTitleCase } from '../../utils/formatters';
import { useAvailability, useBlockedDates } from '../../hooks/useAvailability';
import { useServices } from '../../hooks/useServices';
import { useConfig } from '../../hooks/useConfig';
import { useSpecialists } from '../../hooks/useSpecialists';
import { useRescheduleAppointment, useCancelAppointment } from '../../hooks/useAppointment';
import { useToast } from '../ui/Toast';
import Button from '../ui/Button';
import Spinner from '../ui/Spinner';

const MONTHS_ES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
const MONTH_SHORT = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
const DAYS_ES     = ['Do','Lu','Ma','Mi','Ju','Vi','Sá'];

function initials(name) {
  return (name || '').split(' ').filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join('') || '?';
}

function displayPrice(priceType, price) {
  if (priceType === 'ask') return 'A consultar';
  if (priceType === 'range' || priceType === 'starting_from') return `${formatPrice(price)}+`;
  return formatPrice(price);
}

function toDateStr(d) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

export default function AppointmentCard({ appointment, onUpdated }) {
  const toast             = useToast();
  const { data: config }  = useConfig();
  const { data: svcData } = useServices();
  const timeFmt   = config?.time_format ?? '12h';
  const branches  = config?.branches   ?? [];
  const isMulti   = branches.length > 1;

  // Look up service DB id for specialist filtering
  const serviceDbId = svcData?.services?.find(s => s.id === appointment.serviceId)?.dbId ?? null;

  // Full data for avatar rendering in the card view
  const { data: specialistsData } = useSpecialists();
  const allSpecialistsMain     = specialistsData?.specialists ?? [];
  const appointmentSpecialist  = allSpecialistsMain.find(s => String(s.id) === String(appointment.specialistId));
  const appointmentService     = svcData?.services?.find(s => s.id === appointment.serviceId);
  const appointmentBranch      = branches.find(b => String(b.id) === String(appointment.branchId));

  const [mode,         setMode]         = useState('view');
  const [reschedStep,  setReschedStep]  = useState('branch');
  const [reBranch,     setReBranch]     = useState(null);
  const [reSpecialist, setReSpecialist] = useState(null);
  const [newDate,      setNewDate]      = useState(null);
  const [newTime,      setNewTime]      = useState(null);
  const [viewMonth,    setViewMonth]    = useState(() => {
    const t = new Date();
    return new Date(t.getFullYear(), t.getMonth(), 1);
  });

  const effectiveSpecialistId = reSpecialist?.id || appointment.specialistId;
  const effectiveBranchId     = reBranch?.id     || appointment.branchId;
  const dateStr               = newDate ? toDateStr(newDate) : null;

  const { data: availData, isFetching } = useAvailability(
    mode === 'reschedule' && reschedStep === 'datetime' ? dateStr : null,
    effectiveSpecialistId,
    effectiveBranchId,
    appointment.serviceId,
    mode === 'reschedule' ? appointment.code : null,
  );
  const appointmentIntervals = availData?.appointmentIntervals || [];
  const bufferMins   = availData?.config?.bufferMins   || 0;
  const leadMins     = availData?.config?.leadMins     || 0;
  const closeTime    = availData?.config?.closeTime    || '19:00';
  const staffBlocked = availData?.staffBlocked ?? null;

  const todayStr   = toDateStr(new Date());
  const isToday    = dateStr === todayStr;
  const nowMins    = new Date().getHours() * 60 + new Date().getMinutes();
  const cutoffMins = isToday ? nowMins + leadMins : 0;

  const rescheduleMutation = useRescheduleAppointment();
  const cancelMutation     = useCancelAppointment();
  const isCancelled        = appointment.status === 'cancelled';
  const apptDateTime       = new Date(`${appointment.date}T${(appointment.time ?? '00:00').padStart(5, '0')}:00`);
  const isPastAppt         = apptDateTime < new Date();

  const apptDate   = new Date(appointment.date + 'T12:00:00');
  const monthAbbr  = MONTH_SHORT[apptDate.getMonth()];
  const dayNum     = appointment.date.split('-')[2];

  function openReschedule() {
    const initBranch = branches.find(b => b.id === appointment.branchId) || null;
    setReBranch(initBranch);
    setReSpecialist(null);
    setNewDate(null); setNewTime(null);
    setViewMonth(() => { const t = new Date(); return new Date(t.getFullYear(), t.getMonth(), 1); });
    setReschedStep(isMulti ? 'branch' : 'specialist');
    setMode('reschedule');
  }

  async function handleReschedule() {
    if (!newDate || !newTime) return;
    try {
      const updated = await rescheduleMutation.mutateAsync({
        code:         appointment.code,
        date:         toDateStr(newDate),
        time:         newTime,
        branchId:     reBranch?.id     ?? undefined,
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
    <div className="max-w-xl mx-auto animate-fade-up space-y-3">

      {/* ── Main card ───────────────────────────────────────────────────────── */}
      <div className="card overflow-hidden">

        {/* Status accent line */}
        <div className={`h-[3px] ${
          appointment.status === 'cancelled'   ? 'bg-red-500/80' :
          appointment.status === 'rescheduled' ? 'bg-amber-500/80' :
          'bg-gold'
        }`} />

        {/* Code + status + client */}
        <div className="px-6 pt-5 pb-4 flex items-start justify-between gap-3 border-b border-edge">
          <div className="min-w-0">
            <p className="font-mono text-[22px] font-bold text-gold tracking-[0.18em] leading-tight">
              {appointment.code}
            </p>
            <div className="mt-0.5 space-y-0.5">
              <p className="text-xs text-ink-3 truncate">
                {toTitleCase(appointment.clientName)} · {appointment.clientPhone}
              </p>
              {appointment.clientEmail && (
                <p className="text-xs text-ink-3 truncate">{appointment.clientEmail}</p>
              )}
            </div>
          </div>
          <StatusBadge status={appointment.status} />
        </div>

        {/* Date + Time */}
        <div className="px-6 py-4 flex items-center gap-4 border-b border-edge">
          <div className="w-12 h-12 rounded-2xl bg-gold/8 border border-gold/20 flex flex-col items-center justify-center shrink-0">
            <span className="text-[9px] font-bold uppercase tracking-widest text-gold leading-none">{monthAbbr}</span>
            <span className="text-[22px] font-bold text-gold leading-tight tabular-nums">{dayNum}</span>
          </div>
          <div>
            <p className="text-[14px] font-semibold text-ink leading-snug">{formatDate(appointment.date)}</p>
            <p className="text-[22px] font-bold text-gold tabular-nums leading-tight">
              {formatTime(appointment.time, timeFmt)}
            </p>
          </div>
        </div>

        {/* Service(s) */}
        <div className="px-6 py-4 border-b border-edge">
          <p className="label-section mb-3">
            {appointment.services ? 'Servicios' : appointment.serviceName?.includes(' + ') ? 'Servicios' : 'Servicio'}
          </p>
          {appointment.services ? (
            <div className="space-y-2.5">
              {appointment.services.map((svc, i) => (
                <div key={i} className="flex items-start gap-3">
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
                {appointmentService?.imageUrl
                  ? <img src={appointmentService.imageUrl} alt={appointment.serviceName} className="w-full h-full object-cover" />
                  : <span className="text-sm font-bold text-gold">{initials(appointment.serviceName)}</span>
                }
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[15px] font-semibold text-ink leading-snug truncate">
                  {toTitleCase(appointment.serviceName)}
                </p>
                <p className="text-xs text-ink-3 mt-0.5">{appointment.serviceDuration} min</p>
              </div>
              <p className="text-[17px] font-bold text-gold tabular-nums shrink-0">
                {displayPrice(appointment.priceType, appointment.servicePrice)}
              </p>
            </div>
          )}
        </div>

        {/* Specialist */}
        <div className="px-6 py-4 border-b border-edge">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full border-2 border-gold/20 bg-gold/8 flex items-center justify-center shrink-0 overflow-hidden">
              {appointmentSpecialist?.avatarUrl
                ? <img src={appointmentSpecialist.avatarUrl} alt={appointment.specialistName} className="w-full h-full object-cover" />
                : <span className="text-sm font-bold text-gold">{initials(appointment.specialistName)}</span>
              }
            </div>
            <div>
              <p className="label-section">Especialista</p>
              <p className="text-[14px] font-semibold text-ink mt-0.5">{toTitleCase(appointment.specialistName)}</p>
            </div>
          </div>
        </div>

        {/* Branch */}
        {appointment.branchName && (
          <div className="px-6 py-4 border-b border-edge">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full border-2 border-gold/20 bg-gold/8 flex items-center justify-center shrink-0 overflow-hidden">
                {appointmentBranch?.image_url
                  ? <img src={appointmentBranch.image_url} alt={appointment.branchName} className="w-full h-full object-cover" />
                  : <span className="text-sm font-bold text-gold">{initials(appointment.branchName)}</span>
                }
              </div>
              <div>
                <p className="label-section">Sucursal</p>
                <p className="text-[14px] font-semibold text-ink mt-0.5">{toTitleCase(appointment.branchName)}</p>
              </div>
            </div>
          </div>
        )}

        {/* Total */}
        <div className="px-6 py-3.5 border-b border-edge flex items-center justify-between bg-raised/30">
          <span className="text-[13px] font-semibold text-ink">Total</span>
          <span className="text-[18px] font-bold text-gold tabular-nums">
            {displayPrice(appointment.priceType, appointment.servicePrice)}
          </span>
        </div>

        {/* Reagendada banner */}
        {appointment.status === 'rescheduled' && appointment.previousDate && appointment.previousTime && (
          <div className="mx-4 mt-3 mb-4 flex items-start gap-2 px-3.5 py-2.5 rounded-xl bg-amber-500/6 border border-amber-500/20">
            <svg className="w-3.5 h-3.5 text-amber-500 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
            </svg>
            <p className="text-xs leading-relaxed text-amber-700 dark:text-amber-400">
              <span className="font-semibold">Reagendada.</span>{' '}
              Antes:{' '}
              <span className="line-through">
                {formatDate(appointment.previousDate)} · {formatTime(appointment.previousTime, timeFmt)}
              </span>
            </p>
          </div>
        )}

        {/* Cancelled notice */}
        {isCancelled && (
          <div className="mx-4 mt-3 mb-4 flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-red-500/6 border border-red-500/20 text-xs text-red-500">
            <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/>
            </svg>
            Esta cita fue cancelada.
          </div>
        )}

        {/* Actions — view mode */}
        {!isCancelled && mode === 'view' && (
          <div className="px-6 pt-4 pb-6">
            {isPastAppt ? (
              <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-ink/4 border border-edge text-xs text-ink-3">
                <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
                Esta cita ya ocurrió.
              </div>
            ) : (
              <div className="flex gap-2.5">
                <Button variant="outline" onClick={openReschedule} className="flex-1">
                  Reagendar
                </Button>
                <Button variant="danger" onClick={() => setMode('cancel-confirm')} className="flex-1">
                  Cancelar cita
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Cancel confirm */}
        {mode === 'cancel-confirm' && (
          <div className="px-6 pb-6">
            <div className="p-4 bg-red-500/6 border border-red-500/20 rounded-2xl animate-fade-in">
              <p className="text-[14px] font-semibold text-ink mb-0.5">¿Cancelar esta cita?</p>
              <p className="text-xs text-ink-3 mb-4">Esta acción no se puede deshacer.</p>
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

      {/* ── Reschedule panel ──────────────────────────────────────────────────── */}
      {mode === 'reschedule' && (
        <ReschedulePanel
          appointment={appointment}
          config={config}
          branches={branches}
          isMulti={isMulti}
          serviceDbId={serviceDbId}
          reschedStep={reschedStep}    setReschedStep={setReschedStep}
          reBranch={reBranch}          setReBranch={setReBranch}
          reSpecialist={reSpecialist}  setReSpecialist={setReSpecialist}
          effectiveSpecialistId={effectiveSpecialistId}
          effectiveBranchId={effectiveBranchId}
          staffBlocked={staffBlocked}
          viewMonth={viewMonth}   setViewMonth={setViewMonth}
          newDate={newDate}       setNewDate={d => { setNewDate(d); setNewTime(null); }}
          newTime={newTime}       setNewTime={setNewTime}
          appointmentIntervals={appointmentIntervals}
          bufferMins={bufferMins}  isFetching={isFetching}
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

// ── ReschedulePanel ────────────────────────────────────────────────────────────

function ReschedulePanel({
  appointment, config, branches, isMulti, serviceDbId,
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

  const { data: specialistsData } = useSpecialists();
  const allSpecialists = specialistsData?.specialists ?? [];

  // Filter by branch + by service capability when serviceDbId is known
  const filteredSpecialists = allSpecialists.filter(s => {
    if (effectiveBranchId && s.branchIds?.length && !s.branchIds.includes(effectiveBranchId)) return false;
    if (serviceDbId && s.serviceIds?.length) {
      return s.serviceIds.some(id => Number(id) === Number(serviceDbId));
    }
    return true;
  });

  const hoursByBranch = config?.hours ?? {};
  const bizHoursRaw   = effectiveBranchId
    ? (hoursByBranch[String(effectiveBranchId)] ?? Object.values(hoursByBranch)[0] ?? [])
    : (Array.isArray(hoursByBranch) ? hoursByBranch : Object.values(hoursByBranch)[0] ?? []);
  const daysClosed = bizHoursRaw.filter(h => !h.is_open).map(h => h.day_of_week);

  const monthStr = `${viewMonth.getFullYear()}-${String(viewMonth.getMonth()+1).padStart(2,'0')}`;
  const { data: blockedData } = useBlockedDates(monthStr, effectiveSpecialistId);
  const blockedDates = blockedData?.blockedDates ?? [];

  const today   = new Date(); today.setHours(0, 0, 0, 0);
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
  const daysInMonth = new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(viewMonth.getFullYear(), viewMonth.getMonth(), d));

  const dayEntry  = newDate ? (bizHoursRaw.find(h => h.day_of_week === newDate.getDay()) ?? null) : null;
  const openTime  = dayEntry?.open_time  ?? '9:00';
  const closeTime = dayEntry?.close_time ?? '19:00';
  const allSlots  = newDate ? generateSlots(openTime, closeTime, appointment.serviceDuration, intervalMins, bufferMins) : [];
  const grouped   = groupSlots(allSlots);

  const steps = [
    ...(isMulti ? [{ key: 'branch', label: 'Sucursal' }] : []),
    { key: 'specialist', label: 'Especialista' },
    { key: 'datetime',   label: 'Fecha y hora' },
  ];

  return (
    <div className="card p-5 animate-fade-in">
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-[15px] font-semibold text-ink">Reagendar cita</h3>
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

      {/* Step indicator */}
      <div className="flex items-center mb-6">
        {steps.map((s, i) => {
          const currentIdx = steps.findIndex(x => x.key === reschedStep);
          const done       = i < currentIdx;
          const active     = s.key === reschedStep;
          const clickable  = done;
          return (
            <div key={s.key} className="flex items-center flex-1 last:flex-none">
              {i > 0 && (
                <div className="flex-1 h-px mx-2 relative rounded-full overflow-hidden bg-edge/40">
                  <div
                    className="absolute inset-y-0 left-0 bg-gold/55 rounded-full transition-all duration-500 ease-out"
                    style={{ width: currentIdx >= i ? '100%' : '0%' }}
                  />
                </div>
              )}
              <div className="flex flex-col items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={clickable ? () => setReschedStep(s.key) : undefined}
                  disabled={!clickable}
                  title={clickable ? `Volver a ${s.label}` : undefined}
                  className={[
                    'w-6 h-6 rounded-full flex items-center justify-center transition-all duration-300 border-2',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-1',
                    done
                      ? 'bg-gold border-gold cursor-pointer hover:scale-110 hover:shadow-[0_0_0_4px_rgba(0,184,122,0.2)] active:scale-[0.97]'
                      : active
                        ? 'bg-surface border-gold cursor-default'
                        : 'bg-surface border-edge/50 cursor-default',
                  ].join(' ')}
                >
                  {done ? (
                    <svg className="w-2.5 h-2.5 text-on-gold" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    <span className={`text-[10px] font-bold tabular-nums leading-none ${active ? 'text-gold' : 'text-ink-3/40'}`}>
                      {i + 1}
                    </span>
                  )}
                </button>
                <span className={[
                  'text-[9.5px] font-medium whitespace-nowrap transition-colors duration-200',
                  active ? 'text-ink font-semibold' : done ? 'text-ink-3' : 'text-ink-3/40',
                ].join(' ')}>
                  {s.label}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Step: Branch ── */}
      {reschedStep === 'branch' && (
        <div className="space-y-2.5">
          <p className="text-[13px] font-medium text-ink mb-1">¿En qué sucursal?</p>
          {branches.map(b => (
            <button
              key={b.id}
              onClick={() => { setReBranch(b); setReSpecialist(null); setNewDate(null); setNewTime(null); setReschedStep('specialist'); }}
              className={[
                'w-full flex items-center gap-3 p-3.5 rounded-xl border text-left transition-all cursor-pointer',
                reBranch?.id === b.id
                  ? 'border-gold bg-gold/6 shadow-xs'
                  : 'border-edge bg-card hover:border-gold/40 hover:bg-raised',
              ].join(' ')}
            >
              <div className="w-9 h-9 rounded-full border border-edge overflow-hidden flex items-center justify-center shrink-0">
                {b.image_url
                  ? <img src={b.image_url} alt={b.name} className="w-full h-full object-cover" />
                  : <div className="w-full h-full bg-gold/10 flex items-center justify-center">
                      <svg className="w-4 h-4 text-gold" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0118 0z"/>
                        <circle cx="12" cy="10" r="3"/>
                      </svg>
                    </div>
                }
              </div>
              <div className="min-w-0">
                <p className="text-[13px] font-semibold text-ink truncate">{toTitleCase(b.name)}</p>
                {b.address && <p className="text-xs text-ink-3 truncate">{b.address}</p>}
              </div>
            </button>
          ))}
        </div>
      )}

      {/* ── Step: Specialist ── */}
      {reschedStep === 'specialist' && (
        <div className="space-y-2.5">
          <p className="text-[13px] font-medium text-ink mb-1">¿Con quién?</p>
          {filteredSpecialists.length === 0 ? (
            <p className="text-xs text-ink-3 text-center py-4">Sin especialistas disponibles.</p>
          ) : filteredSpecialists.map(s => (
            <button
              key={s.id}
              onClick={() => { setReSpecialist(s); setNewDate(null); setNewTime(null); setReschedStep('datetime'); }}
              className={[
                'w-full flex items-center gap-3 p-3.5 rounded-xl border text-left transition-all',
                reSpecialist?.id === s.id
                  ? 'border-gold bg-gold/6 shadow-xs'
                  : 'border-edge bg-card hover:border-gold/40 hover:bg-raised',
              ].join(' ')}
            >
              <div className="w-9 h-9 rounded-full bg-raised border border-edge flex items-center justify-center shrink-0 overflow-hidden">
                {s.avatarUrl
                  ? <img src={s.avatarUrl} alt={s.name} className="w-full h-full object-cover" />
                  : <span className="text-xs font-bold text-gold">{s.initials}</span>
                }
              </div>
              <div className="min-w-0">
                <p className="text-[13px] font-semibold text-ink truncate">{toTitleCase(s.name)}</p>
                {s.specialty && <p className="text-xs text-ink-3 truncate">{s.specialty}</p>}
              </div>
            </button>
          ))}
          {isMulti && (
            <button onClick={() => setReschedStep('branch')} className="text-xs text-ink-3 hover:text-ink mt-1 cursor-pointer">
              ← Cambiar sucursal
            </button>
          )}
        </div>
      )}

      {/* ── Step: Date + Time ── */}
      {reschedStep === 'datetime' && (
        <div className="space-y-4">
          {/* Context pills */}
          {(reBranch || reSpecialist) && (
            <div className="flex flex-wrap gap-1.5">
              {reBranch && (
                <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-ink-2 bg-raised border border-edge px-2 py-1 rounded-full">
                  <div className="w-4 h-4 rounded-full overflow-hidden border border-edge bg-gold/10 flex items-center justify-center shrink-0">
                    {reBranch.image_url
                      ? <img src={reBranch.image_url} className="w-full h-full object-cover" alt="" />
                      : <svg className="w-2.5 h-2.5 text-gold" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0118 0z"/>
                          <circle cx="12" cy="10" r="3"/>
                        </svg>
                    }
                  </div>
                  {toTitleCase(reBranch.name)}
                </span>
              )}
              {reSpecialist && (
                <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-ink-2 bg-raised border border-edge px-2 py-1 rounded-full">
                  <div className="w-4 h-4 rounded-full overflow-hidden border border-gold/20 bg-gold/8 flex items-center justify-center shrink-0">
                    {reSpecialist.avatarUrl
                      ? <img src={reSpecialist.avatarUrl} className="w-full h-full object-cover" alt="" />
                      : <span className="text-[7px] font-bold text-gold leading-none">{initials(reSpecialist.name)}</span>
                    }
                  </div>
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
                    onClick={() => setNewDate(date)}
                    className={[
                      'relative h-8 text-xs rounded-lg font-medium transition-all duration-160',
                      disabled ? 'text-ink-3/30 cursor-not-allowed' : 'cursor-pointer',
                      isSel    ? 'bg-gold text-on-gold shadow-xs' : '',
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

          {/* Time slots */}
          {newDate && (
            isFetching ? (
              <div className="flex justify-center py-6"><Spinner size="sm" /></div>
            ) : staffBlocked ? (
              <div className="flex flex-col items-center gap-2 py-5 text-center rounded-xl bg-raised border border-edge">
                <svg className="w-5 h-5 text-ink-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"/>
                </svg>
                <div>
                  <p className="text-sm font-medium text-ink">Día no disponible</p>
                  <p className="text-xs text-ink-3 mt-0.5">
                    {staffBlocked.reason || 'El especialista no estará disponible este día.'}
                  </p>
                </div>
              </div>
            ) : allSlots.length === 0 ? (
              <div className="flex items-center justify-center gap-2 py-5 rounded-xl bg-raised border border-edge">
                <p className="text-xs text-ink-3">Sin horarios disponibles. Elige otro día.</p>
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
                      <div className="grid grid-cols-3 gap-2">
                        {slots.map(slot => {
                          const [sh, sm]  = slot.split(':').map(Number);
                          const slotStart = sh * 60 + sm;
                          const slotEnd   = slotStart + appointment.serviceDuration;
                          const isPast    = isToday && slotStart <= cutoffMins;
                          const busy      = isPast
                            || slotEnd > closeMins
                            || appointmentIntervals.some(({ startMin, endMin }) => slotStart < endMin && slotEnd > startMin);
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

          <div className="flex gap-2.5 pt-1">
            <Button onClick={onConfirm} disabled={!newDate || !newTime} loading={isLoading}>
              Confirmar nuevo horario
            </Button>
            <Button variant="ghost" onClick={() => setReschedStep('specialist')}>Atrás</Button>
          </div>
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }) {
  const map = {
    confirmed:   { cls: 'badge badge-confirmed',   label: 'Confirmada'  },
    cancelled:   { cls: 'badge badge-cancelled',   label: 'Cancelada'   },
    rescheduled: { cls: 'badge badge-rescheduled', label: 'Reagendada'  },
    no_show:     { cls: 'badge',                   label: 'No asistió'  },
  };
  const { cls, label } = map[status] ?? { cls: 'badge', label: status };
  return <span className={cls}>{label}</span>;
}
