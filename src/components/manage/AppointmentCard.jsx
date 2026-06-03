import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
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
  const queryClient       = useQueryClient();
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
    // Force fresh specialist + service data so changes made in admin-app are reflected.
    queryClient.invalidateQueries({ queryKey: ['specialists'] });
    queryClient.invalidateQueries({ queryKey: ['services'] });
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
              {appointment.services.map((svc) => (
                <div key={svc.serviceName} className="flex items-start gap-3">
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
          allSpecialists={allSpecialistsMain}
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
  allSpecialists = [],
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

  // Filter by branch + service — use Number() comparison (matching /agendar logic)
  // to avoid type mismatches where branchIds/serviceIds are numbers but IDs are strings.
  const filteredSpecialists = allSpecialists.filter(s => {
    if (effectiveBranchId && s.branchIds?.length) {
      const inBranch = s.branchIds.some(id => Number(id) === Number(effectiveBranchId));
      if (!inBranch) return false;
    }
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

  const specialistName = reSpecialist?.name ?? null;
  const branchName     = reBranch?.name     ?? null;

  // Close × button — reused in all steps
  function CloseBtn() {
    return (
      <button onClick={onCancel} aria-label="Cerrar"
        className="w-8 h-8 flex items-center justify-center rounded-xl text-ink-3 hover:text-ink hover:bg-raised transition-all cursor-pointer shrink-0">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/>
        </svg>
      </button>
    );
  }

  // Back button — same style as /agendar SpecialistSelector
  function ReBack({ onClick: handleClick, label }) {
    return (
      <button type="button" onClick={handleClick}
        className="group inline-flex items-center gap-2.5 px-3 py-2.5 -mx-3 rounded-xl
                   text-sm font-medium text-ink-2 hover:text-ink hover:bg-raised/70
                   transition-all duration-200 cursor-pointer active:scale-[0.98]">
        <span className="w-7 h-7 rounded-full border border-edge/80 group-hover:border-ink/30 group-hover:bg-card
                         flex items-center justify-center shrink-0 transition-all duration-200">
          <svg className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform duration-200"
               fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7"/>
          </svg>
        </span>
        {label}
      </button>
    );
  }

  return (
    <div className="animate-fade-in">

      {/* ── Step: Branch ── */}
      {reschedStep === 'branch' && (
        <div className="card p-5 sm:p-6 animate-fade-up">
          <div className="flex items-start justify-between mb-7">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-gold/70 mb-0.5">Reagendando</p>
              <h3 className="font-display text-xl font-semibold text-ink tracking-tight leading-tight">
                {toTitleCase(appointment.serviceName)}
              </h3>
            </div>
            <CloseBtn />
          </div>
          <div className="mb-6">
            <h4 className="font-display text-[1.1rem] font-semibold text-ink tracking-tight">Elige tu sucursal</h4>
            <p className="text-ink-3 text-sm mt-0.5">¿En cuál ubicación deseas tu nueva cita?</p>
          </div>
          <div className="space-y-2.5">
            {branches.map((b, i) => (
              <button
                key={b.id}
                onClick={() => { setReBranch(b); setReSpecialist(null); setNewDate(null); setNewTime(null); setReschedStep('specialist'); }}
                className="w-full text-left group flex items-center gap-4 p-5 rounded-2xl border border-edge bg-card
                           hover:border-gold/40 hover:shadow-card active:scale-[0.99]
                           transition-all duration-240 cursor-pointer animate-fade-up"
                style={{ animationDelay: `${i * 40}ms`, animationFillMode: 'both' }}
              >
                <div className="shrink-0 w-14 h-14 rounded-full overflow-hidden flex items-center justify-center
                                bg-raised border-2 border-edge group-hover:border-gold/50 transition-all duration-240">
                  {b.image_url
                    ? <img src={b.image_url} alt={b.name} className="w-full h-full object-cover"/>
                    : <span className="text-[1.125rem] font-bold text-gold/80 select-none">
                        {b.name?.trim().split(/\s+/).slice(0,2).map(w=>w[0]).join('').toUpperCase()}
                      </span>
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-[0.9375rem] text-ink group-hover:text-gold transition-colors duration-160 truncate">
                    {toTitleCase(b.name)}
                  </p>
                  {b.address && (
                    <div className="flex items-start gap-1.5 mt-1">
                      <svg className="w-3.5 h-3.5 text-ink-3 shrink-0 mt-px" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z"/>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z"/>
                      </svg>
                      <p className="text-xs text-ink-3 leading-snug line-clamp-2">{b.address}</p>
                    </div>
                  )}
                  {b.phone && (
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <svg className="w-3.5 h-3.5 text-ink-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z"/>
                      </svg>
                      <p className="text-xs text-ink-3">{b.phone}</p>
                    </div>
                  )}
                </div>
                <svg className="w-4 h-4 text-ink-3 group-hover:text-gold transition-colors shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7"/>
                </svg>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Step: Specialist ── */}
      {reschedStep === 'specialist' && (
        <div className="card p-5 sm:p-6 animate-fade-up">
          <div className="flex items-center justify-between mb-7">
            <ReBack
              onClick={isMulti ? () => setReschedStep('branch') : onCancel}
              label={isMulti ? 'Cambiar sucursal' : 'Cancelar'}
            />
            <CloseBtn />
          </div>
          <div className="mb-6">
            <h4 className="font-display text-[1.1rem] font-semibold text-ink tracking-tight">Elige tu especialista</h4>
            <p className="text-ink-3 text-sm mt-0.5">
              Para <span className="text-ink font-medium">{toTitleCase(appointment.serviceName)}</span>
            </p>
          </div>
          {filteredSpecialists.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-14 text-center card">
              <div className="w-12 h-12 rounded-xl bg-raised flex items-center justify-center mb-3">
                <svg className="w-5 h-5 text-ink-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"/>
                </svg>
              </div>
              <p className="text-sm font-semibold text-ink">Sin especialistas disponibles</p>
              <p className="text-xs text-ink-3 mt-1 max-w-xs">Ningún colaborador tiene asignado este servicio.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {filteredSpecialists.map((s, i) => (
                <button
                  key={s.id}
                  onClick={() => { setReSpecialist(s); setNewDate(null); setNewTime(null); setReschedStep('datetime'); }}
                  className="group flex sm:flex-col items-start sm:items-center gap-4 sm:gap-3 p-5 rounded-2xl border border-edge bg-card
                             text-left sm:text-center hover:border-gold/40 hover:shadow-card
                             active:scale-[0.99] transition-all duration-240 cursor-pointer animate-fade-up"
                  style={{ animationDelay: `${i * 50}ms`, animationFillMode: 'both' }}
                >
                  <div className="shrink-0 w-14 h-14 rounded-full bg-raised border-2 border-edge mt-0.5 sm:mt-0
                                  group-hover:border-gold/50 flex items-center justify-center transition-all duration-240 overflow-hidden">
                    {s.avatarUrl
                      ? <img src={s.avatarUrl} alt={s.name} className="w-full h-full object-cover"/>
                      : <span className="font-display text-xl font-bold text-gold">{s.initials}</span>
                    }
                  </div>
                  <div className="flex-1 sm:flex-none min-w-0">
                    <p className="font-semibold text-[0.9375rem] text-ink group-hover:text-gold transition-colors duration-160">
                      {toTitleCase(s.name)}
                    </p>
                    {s.specialty && (
                      <p className="text-xs text-ink-3 mt-0.5 sm:mt-1 leading-snug">{s.specialty}</p>
                    )}
                    {s.bio && (
                      <p className="text-xs text-ink-3/70 mt-1.5 leading-relaxed line-clamp-2 sm:line-clamp-3">{s.bio}</p>
                    )}
                  </div>
                  <svg className="w-4 h-4 text-ink-3 sm:hidden shrink-0 mt-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7"/>
                  </svg>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Step: Date + Time ── identical layout to /agendar DateTimePicker */}
      {reschedStep === 'datetime' && (
        <div className="animate-fade-up">

          {/* Back + close row */}
          <div className="flex items-center justify-between mb-5">
            <ReBack onClick={() => setReschedStep('specialist')} label="Cambiar especialista" />
            <CloseBtn />
          </div>

          {/* Title */}
          <div className="mb-5">
            <h3 className="font-display text-2xl font-semibold text-ink tracking-tight">Elige fecha y hora</h3>
            <p className="text-ink-3 text-sm mt-1">
              {specialistName && <>Con <span className="text-ink font-medium">{toTitleCase(specialistName)}</span></>}
              {branchName && specialistName && <span className="text-ink-3/50"> · </span>}
              {branchName && <span className="text-ink font-medium">{toTitleCase(branchName)}</span>}
            </p>
          </div>

          {/* Two-column grid: calendar left, slots right — same as DateTimePicker */}
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_1fr] gap-4">

            {/* Calendar */}
            <div className="card p-5">
              <div className="flex items-center justify-between mb-5">
                <button onClick={() => setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth()-1, 1))}
                  className="w-8 h-8 flex items-center justify-center rounded-lg text-ink-3 hover:text-ink hover:bg-raised transition-all cursor-pointer" aria-label="Mes anterior">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7"/>
                  </svg>
                </button>
                <span className="text-sm font-semibold text-ink capitalize">
                  {MONTHS_ES[viewMonth.getMonth()]} {viewMonth.getFullYear()}
                </span>
                <button onClick={() => setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth()+1, 1))}
                  className="w-8 h-8 flex items-center justify-center rounded-lg text-ink-3 hover:text-ink hover:bg-raised transition-all cursor-pointer" aria-label="Mes siguiente">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7"/>
                  </svg>
                </button>
              </div>
              <div className="grid grid-cols-7 mb-2">
                {DAYS_ES.map(d => (
                  <div key={d} className="text-center text-[0.6875rem] font-medium text-ink-3 py-1">{d}</div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-y-1">
                {cells.map((date, i) => {
                  if (!date) return <div key={`e-${i}`} />;
                  const disabled = isDisabled(date);
                  const isT      = toDateStr(date) === todayStr;
                  const isSel    = newDate && toDateStr(date) === toDateStr(newDate);
                  return (
                    <button key={toDateStr(date)} disabled={disabled} onClick={() => setNewDate(date)}
                      className={[
                        'relative h-9 w-full rounded-lg text-sm font-medium transition-all duration-160',
                        disabled ? 'text-ink-3/30 cursor-not-allowed' : 'cursor-pointer',
                        isSel    ? 'bg-gold text-on-gold shadow-xs' : '',
                        !isSel && isT && !disabled ? 'text-gold font-semibold' : '',
                        !isSel && !disabled ? 'hover:bg-raised text-ink' : '',
                      ].join(' ')}
                    >
                      {date.getDate()}
                      {isT && !isSel && (
                        <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-gold" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Time slots */}
            <div className="card p-5 min-h-[280px] flex flex-col">
              {!newDate && (
                <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center">
                  <div className="w-12 h-12 rounded-xl bg-raised flex items-center justify-center">
                    <svg className="w-5 h-5 text-ink-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5"/>
                    </svg>
                  </div>
                  <p className="text-sm text-ink-3">Selecciona una fecha</p>
                </div>
              )}
              {newDate && isFetching && (
                <div className="flex-1 flex items-center justify-center"><Spinner size="sm" /></div>
              )}
              {newDate && !isFetching && staffBlocked && (
                <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center px-2">
                  <div className="w-12 h-12 rounded-xl bg-raised flex items-center justify-center">
                    <svg className="w-5 h-5 text-ink-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"/>
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-ink">Día no disponible</p>
                    <p className="text-xs text-ink-3 mt-1">{staffBlocked.reason || 'El especialista no estará disponible este día.'}</p>
                  </div>
                </div>
              )}
              {newDate && !isFetching && !staffBlocked && (
                <div className="space-y-4 flex-1">
                  {allSlots.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center px-2 py-8">
                      <div className="w-12 h-12 rounded-xl bg-raised flex items-center justify-center">
                        <svg className="w-5 h-5 text-ink-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"/>
                        </svg>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-ink">Sin disponibilidad</p>
                        <p className="text-xs text-ink-3 mt-1">Elige otra fecha.</p>
                      </div>
                    </div>
                  ) : (
                    Object.entries({ morning: 'Mañana', afternoon: 'Tarde', evening: 'Noche' }).map(([key, label]) => {
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
                              const busy      = isPast || slotEnd > closeMins
                                || appointmentIntervals.some(({ startMin, endMin }) => slotStart < endMin && slotEnd > startMin);
                              const sel = newTime === slot;
                              return (
                                <button key={slot} disabled={busy} onClick={() => setNewTime(slot)}
                                  className={[
                                    'py-2.5 rounded-xl text-sm font-medium transition-all duration-160',
                                    busy ? 'text-ink-3/40 line-through cursor-not-allowed bg-raised/50' : 'cursor-pointer',
                                    sel  ? 'bg-gold text-on-gold shadow-xs'
                                         : !busy ? 'bg-raised text-ink-2 hover:bg-edge hover:text-ink active:scale-[0.97]' : '',
                                  ].join(' ')}>
                                  {formatTime(slot, timeFmt)}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Confirm */}
          {newDate && newTime && (
            <div className="mt-4">
              <Button onClick={onConfirm} loading={isLoading} className="w-full sm:w-auto">
                Confirmar nuevo horario
              </Button>
            </div>
          )}
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
