import { useState, useEffect, useRef } from 'react';
import { formatDate, formatTime, formatPrice, toTitleCase } from '../../utils/formatters';
import { PromoTag, StruckPrice, SavingsNote } from '../ui/PromoPrice';
import { useGroupAvailability, useBlockedDates } from '../../hooks/useAvailability';
import { findNextAvailableDate, todayDateInTz, isPastDateTime } from '../../utils/businessTime';
import { useServices } from '../../hooks/useServices';
import { useConfig } from '../../hooks/useConfig';
import { useSpecialists } from '../../hooks/useSpecialists';
import { useRescheduleGroupAppointment, useCancelGroupAppointment } from '../../hooks/useAppointment';
import { useRescheduleFlow } from '../../hooks/useRescheduleFlow';
import { useCancelFlow } from '../../hooks/useCancelFlow';
import { useToast } from '../ui/Toast';
import Button from '../ui/Button';
import Spinner from '../ui/Spinner';
import OTPPanel from '../booking/OTPPanel';
import { api } from '../../services/api';

function initials(name) {
  return (name || '').split(' ').filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join('') || '?';
}

function displayPrice(priceType, price) {
  if (priceType === 'ask') return 'A consultar';
  if (priceType === 'range' || priceType === 'starting_from') return `${formatPrice(price)}+`;
  return formatPrice(price);
}

const MONTHS_ES   = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
const MONTH_SHORT = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
const DAYS_ES     = ['Lu','Ma','Mi','Ju','Vi','Sá','Do'];

function toDateStr(d) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}
function minsToStr(m) {
  const h = Math.floor(m / 60); const min = m % 60;
  return `${String(h).padStart(2,'0')}:${String(min).padStart(2,'0')}`;
}

export default function GroupAppointmentCard({ group, onUpdated }) {
  const toast            = useToast();
  const { data: config }  = useConfig();
  const { data: svcData } = useServices();
  const timeFmt  = config?.time_format ?? '12h';
  const branches = config?.branches   ?? [];

  const allCancelled = group.appointments?.every(a => a.status === 'cancelled');
  const status       = allCancelled ? 'cancelled' : group.status;
  const isCancelled  = status === 'cancelled';

  // Date box values
  const apptDate  = new Date(group.date + 'T12:00:00');
  const monthAbbr = MONTH_SHORT[apptDate.getMonth()];
  const dayNum    = group.date?.split('-')[2];

  // Overall start time = first appointment's time
  const startTime = group.appointments?.[0]?.time ?? null;
  const bizTz     = config?.business_timezone ?? null;
  const isPast    = group.date ? isPastDateTime(group.date, startTime ?? '23:59', bizTz) : false;

  const maxReschedules      = config?.max_reschedules ?? null;
  const rescheduleCount     = group.appointments?.[0]?.rescheduleCount ?? 0;
  const reschedLimitReached = maxReschedules !== null && rescheduleCount >= maxReschedules;
  const reschedRemaining    = maxReschedules !== null ? maxReschedules - rescheduleCount : null;

  // Branch info
  const groupBranchId   = group.appointments?.[0]?.branchId ?? null;
  const groupBranch     = branches.find(b => String(b.id) === String(groupBranchId));
  const groupBranchName = group.appointments?.[0]?.branchName ?? groupBranch?.name ?? null;

  const { data: specialistsData } = useSpecialists();
  const allSpecialists = specialistsData?.specialists ?? [];

  const [mode, setMode]    = useState('view');
  const cancelMutation     = useCancelGroupAppointment();
  const rescheduleMutation = useRescheduleGroupAppointment();

  // Manage (cancelar/reagendar) usa su propio flag efectivo: con el cupo de SMS
  // agotado el backend lo apaga bajo AMBAS políticas (§12 R9) — cancelar nunca
  // se bloquea. Fallback al flag general para configs cacheadas viejas.
  const manageOtpRequired = config?.manage_verification_required ?? config?.phone_verification_required;

  const rescheduleFlow = useRescheduleFlow({
    phoneVerificationRequired: manageOtpRequired,
    rescheduleMutation,
    requestOtpFn: () => api.requestManageOTP({ code: group.groupCode }),
    onSuccess: (updated) => { setMode('view'); onUpdated?.(updated); },
    onOtpReady: () => setMode('reschedule-otp'),
    toastFn: toast,
    successMessage: 'Visita reagendada correctamente.',
  });

  const cancelFlow = useCancelFlow({
    phoneVerificationRequired: manageOtpRequired,
    cancelMutation,
    requestOtpFn: () => api.requestManageOTP({ code: group.groupCode }),
    onSuccess: (updated) => { setMode('view'); onUpdated?.(updated); },
    onOtpReady: () => setMode('cancel-otp'),
    toastFn: toast,
    successMessage: 'Visita cancelada.',
  });

  function handleGroupReschedule(date, time) {
    rescheduleFlow.initiateReschedule({ code: group.groupCode, date, time });
  }

  function handleCancel() {
    cancelFlow.initiateCancel({ code: group.groupCode });
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
            <div className="mt-0.5 space-y-0.5">
              <p className="text-xs text-ink-3 truncate">
                {toTitleCase(group.clientName)} · {group.clientPhone}
              </p>
              {group.clientEmail && (
                <p className="text-xs text-ink-3 truncate">{group.clientEmail}</p>
              )}
            </div>
          </div>
          <StatusBadge status={status} />
        </div>

        {/* Date + Time */}
        <div className="px-6 py-4 flex items-center gap-4 border-b border-edge">
          <div className="w-12 h-12 rounded-2xl bg-gold/8 border border-gold/20 flex flex-col items-center justify-center shrink-0">
            <span className="text-[10px] font-bold uppercase tracking-widest text-gold leading-none">{monthAbbr}</span>
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
              const svcObj     = svcData?.services?.find(s => s.id === appt.serviceId);
              return (
                <div key={appt.code} className="flex items-start gap-3">
                  {/* Service avatar */}
                  <div className="w-9 h-9 rounded-full border-2 border-gold/20 bg-gold/8 flex items-center justify-center shrink-0 overflow-hidden mt-0.5">
                    {svcObj?.imageUrl
                      ? <img src={svcObj.imageUrl} alt={appt.serviceName} className="w-full h-full object-cover" />
                      : <span className="text-[12px] font-bold text-gold">{initials(appt.serviceName)}</span>
                    }
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-semibold text-ink leading-snug">
                      {toTitleCase(appt.serviceName)}
                    </p>
                    {/* Specialist mini-avatar + info */}
                    <div className="flex items-center gap-1.5 mt-1">
                      <div className="w-5 h-5 rounded-full border border-gold/30 bg-gold/8 flex items-center justify-center shrink-0 overflow-hidden">
                        {specialist?.avatarUrl
                          ? <img src={specialist.avatarUrl} alt={appt.specialistName} className="w-full h-full object-cover" />
                          : <span className="text-[10px] font-bold text-gold">{initials(appt.specialistName)}</span>
                        }
                      </div>
                      <p className="text-[12px] text-ink-3 leading-none">
                        {toTitleCase(appt.specialistName)}
                        {' · '}
                        <span className="text-gold font-medium">{formatTime(appt.time, timeFmt)}</span>
                        {' · '}{appt.serviceDuration} min
                      </p>
                    </div>
                    {appt.discountAmount > 0 && (
                      <PromoTag
                        className="mt-1.5"
                        promotionName={appt.promotionName} promotionType={appt.promotionType}
                        promotionValue={appt.promotionValue} promotionCode={appt.promotionCode}
                        discountAmount={appt.discountAmount}
                      />
                    )}
                    {appt.status === 'cancelled' && (
                      <span className="badge badge-cancelled text-[11px] mt-1.5 inline-block">Cancelada</span>
                    )}
                  </div>
                  {appt.discountAmount > 0 && appt.originalPrice != null ? (
                    <StruckPrice
                      original={displayPrice(appt.priceType, appt.originalPrice)}
                      final={displayPrice(appt.priceType, appt.servicePrice)}
                      size="sm"
                    />
                  ) : (
                    <p className="text-[13px] font-semibold text-gold tabular-nums shrink-0">
                      {displayPrice(appt.priceType, appt.servicePrice)}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Branch */}
        {groupBranchName && (
          <div className="px-6 py-4 border-b border-edge">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full border-2 border-gold/20 bg-gold/8 flex items-center justify-center shrink-0 overflow-hidden">
                {groupBranch?.image_url
                  ? <img src={groupBranch.image_url} alt={groupBranchName} className="w-full h-full object-cover" />
                  : <span className="text-sm font-bold text-gold">{initials(groupBranchName)}</span>
                }
              </div>
              <div>
                <p className="label-section">Sucursal</p>
                <p className="text-[14px] font-semibold text-ink mt-0.5">{groupBranchName}</p>
              </div>
            </div>
          </div>
        )}

        {/* Total — con promo: lista tachada + total promocional + ahorro */}
        <div className="px-6 py-3.5 border-b border-edge flex items-center justify-between bg-raised/30">
          <span className="text-[13px] font-semibold text-ink">Total</span>
          {(() => {
            const appts = group.appointments ?? [];
            const allAsk = appts.every(a => a.priceType === 'ask');
            const hasVariable = appts.some(a => a.priceType === 'ask' || a.priceType === 'range' || a.priceType === 'starting_from');
            const suffix = hasVariable && !allAsk ? '+' : '';
            const totalFmt = allAsk ? 'A consultar' : `${formatPrice(group.totalPrice)}${suffix}`;
            const savings = Number(group.totalDiscount) > 0 ? Number(group.totalDiscount) : 0;
            if (!allAsk && savings > 0 && group.originalTotal != null) {
              const promoNames = [...new Set(appts.map(a => a.promotionName).filter(Boolean))].join(' + ');
              return (
                <div className="text-right">
                  <StruckPrice original={`${formatPrice(group.originalTotal)}${suffix}`} final={totalFmt} size="xl" />
                  <SavingsNote amount={savings} promoName={promoNames} verb="Ahorraste" className="mt-0.5" />
                </div>
              );
            }
            return <span className="text-[18px] font-bold text-gold tabular-nums">{totalFmt}</span>;
          })()}
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
            {isPast ? (
              <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-ink/4 border border-edge text-xs text-ink-3">
                <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
                Esta visita ya ocurrió.
              </div>
            ) : (
              <div className="space-y-3">
                {reschedLimitReached ? (
                  <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-ink/4 border border-edge text-xs text-ink-3">
                    <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"/>
                    </svg>
                    Límite de reagendamientos alcanzado ({rescheduleCount}/{maxReschedules}).
                  </div>
                ) : (
                  <div className="flex flex-col gap-1.5">
                    {reschedRemaining === 1 && (
                      <p className="text-[12px] text-amber-600 dark:text-amber-400 font-medium px-0.5">
                        Solo puedes reagendar 1 vez más.
                      </p>
                    )}
                    <div className="flex gap-2.5">
                      <Button variant="outline" onClick={() => setMode('reschedule')} className="flex-1">
                        Reagendar
                      </Button>
                      <Button variant="danger" onClick={() => setMode('cancel-confirm')} className="flex-1">
                        Cancelar visita
                      </Button>
                    </div>
                  </div>
                )}
                {reschedLimitReached && (
                  <Button variant="danger" onClick={() => setMode('cancel-confirm')} className="w-full">
                    Cancelar visita
                  </Button>
                )}
              </div>
            )}
          </div>
        )}

      </div>

      {/* Cancel confirm */}
      {mode === 'cancel-confirm' && (
        <div className="card p-5 sm:p-6 animate-fade-in">
          <p className="text-[14px] font-semibold text-ink mb-0.5">¿Cancelar esta visita?</p>
          <p className="text-xs text-ink-3 mb-4">Se cancelarán todos los servicios del grupo. Esta acción no se puede deshacer.</p>
          <div className="flex gap-2.5">
            <Button
              variant="danger"
              loading={cancelFlow.isPending}
              onClick={handleCancel}
            >
              Sí, cancelar
            </Button>
            <Button variant="ghost" onClick={() => setMode('view')}>Volver</Button>
          </div>
        </div>
      )}

      {/* Cancel OTP verification */}
      {mode === 'cancel-otp' && (
        <OTPPanel
          key={cancelFlow.otpKey}
          phone={cancelFlow.otpPhone}
          loading={cancelFlow.isPending || cancelMutation.isPending}
          error={cancelFlow.otpError}
          resendCooldown={cancelFlow.resendCooldown}
          onVerify={(otpCode) => cancelFlow.handleOtpVerify(otpCode, { code: group.groupCode })}
          onResend={cancelFlow.handleResend}
          onBack={() => { setMode('cancel-confirm'); cancelFlow.resetOtp(); }}
          backLabel="Volver"
        />
      )}

      {/* Reschedule OTP verification overlay */}
      {mode === 'reschedule-otp' && (
        <OTPPanel
          key={rescheduleFlow.otpKey}
          phone={rescheduleFlow.otpPhone}
          loading={rescheduleFlow.isPending || rescheduleMutation.isPending}
          error={rescheduleFlow.otpError}
          resendCooldown={rescheduleFlow.resendCooldown}
          onVerify={rescheduleFlow.handleOtpVerify}
          onResend={rescheduleFlow.handleResend}
          onBack={() => { setMode('reschedule'); rescheduleFlow.resetOtp(); }}
          backLabel="Volver a elegir horario"
        />
      )}

      {/* Reschedule panel */}
      {mode === 'reschedule' && (
        <GroupReschedulePanel
          group={group}
          config={config}
          timeFmt={timeFmt}
          isLoading={rescheduleFlow.isPending}
          onCancel={() => setMode('view')}
          onConfirm={handleGroupReschedule}
        />
      )}
    </div>
  );
}

// ── GroupReschedulePanel ───────────────────────────────────────────────────────

function GroupReschedulePanel({ group, config, timeFmt, isLoading = false, onCancel, onConfirm }) {
  const maxAdvance   = config?.max_advance_days ?? 30;
  const tz            = config?.business_timezone ?? null;
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

  // Exclude the group's own appointments from busy intervals — otherwise its
  // current slot (and any time overlapping it) would show as unavailable
  // when the reschedule date matches the current appointment date.
  const excludeCodes = (group.appointments ?? []).map(a => a.code).filter(Boolean);

  const { data: availData, isFetching, isError } = useGroupAvailability(dateStr, assignments, branchId, excludeCodes);
  const availableSlots = availData?.availableSlots ?? [];
  const totalDuration  = availData?.totalDuration  ?? group.totalDuration;

  const groupSpecialistIds = [...new Set(assignments.map(a => a.specialistId).filter(Boolean))].join(',');

  const monthStr = `${viewMonth.getFullYear()}-${String(viewMonth.getMonth()+1).padStart(2,'0')}`;
  const { data: blockedData } = useBlockedDates(monthStr, null, branchId, groupSpecialistIds);
  const blockedDates = blockedData?.blockedDates ?? [];

  // true mientras config u horarios bloqueados aún no cargan (evita flash de "Selecciona una fecha")
  const waitingForSetup = !config || !blockedData;
  // true cuando el día está resuelto (no cargando, no error) pero sin horarios disponibles para el grupo
  const exhaustedFlag = !!(newDate && !isFetching && !isError && availableSlots.length === 0);

  const autoSelectedRef     = useRef(false);
  const skippedDatesRef     = useRef(new Set());
  const autoAdvanceCountRef = useRef(0);
  const MAX_AUTO_ADVANCES   = 7;
  const [noMoreDates, setNoMoreDates] = useState(false);

  // Auto-selección del próximo día disponible
  useEffect(() => {
    if (autoSelectedRef.current || newDate || bizHoursRaw.length === 0 || !blockedData) return;
    const next = findNextAvailableDate({ tz, bizHours: bizHoursRaw, blockedDates, leadMins: config?.booking_lead_mins ?? 0, maxAdvanceDays: maxAdvance });
    if (next) {
      autoSelectedRef.current = true;
      setNewDate(next);
      setViewMonth(new Date(next.getFullYear(), next.getMonth(), 1));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bizHoursRaw.length, blockedDates.length, !!blockedData]);

  // Auto-avance cuando el día no tiene horarios disponibles para el grupo.
  // Limitado a MAX_AUTO_ADVANCES para no encadenar decenas de llamadas al API.
  useEffect(() => {
    if (!exhaustedFlag || !newDate) return;
    if (autoAdvanceCountRef.current >= MAX_AUTO_ADVANCES) {
      setNoMoreDates(true);
      return;
    }
    setNoMoreDates(false);
    autoAdvanceCountRef.current++;
    skippedDatesRef.current.add(toDateStr(newDate));
    const next = findNextAvailableDate({
      tz,
      bizHours: bizHoursRaw,
      blockedDates: [...blockedDates, ...skippedDatesRef.current],
      maxAdvanceDays: maxAdvance,
    });
    if (next) {
      setNewDate(next);
      setNewTime(null);
      setViewMonth(new Date(next.getFullYear(), next.getMonth(), 1));
    } else {
      setNoMoreDates(true);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [exhaustedFlag]);

  function handleSelectDate(date) {
    autoSelectedRef.current = true;
    autoAdvanceCountRef.current = 0;
    setNoMoreDates(false);
    setNewDate(date);
    setNewTime(null);
  }

  const today   = todayDateInTz(tz);
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

  const firstDay    = (viewMonth.getDay() + 6) % 7; // 0=Lunes … 6=Domingo
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
  const { data: specialistsData } = useSpecialists();
  const allSpecialists = specialistsData?.specialists ?? [];

  function handleConfirm() {
    if (!newDate || !newTime) return;
    onConfirm(toDateStr(newDate), newTime);
  }

  return (
    <div className="animate-fade-in">
      {/* Back — mismo patrón que /agendar */}
      <button
        onClick={onCancel}
        className="group inline-flex items-center gap-2.5 px-3 py-2.5 -mx-3 rounded-xl
                   text-sm font-medium text-ink-2 hover:text-ink hover:bg-raised/70
                   transition-all duration-200 cursor-pointer active:scale-[0.98] mb-6"
      >
        <span className="w-7 h-7 rounded-full border border-edge/80 group-hover:border-ink/30 group-hover:bg-card
                         flex items-center justify-center shrink-0 transition-all duration-200">
          <svg className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform duration-200"
               fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7"/>
          </svg>
        </span>
        Volver
      </button>

      <h3 className="font-display text-2xl font-semibold text-ink tracking-tight mb-1">Elige nueva fecha y hora</h3>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mb-6">
        <p className="text-ink-3 text-sm">
          Para tu visita de <span className="text-ink font-medium">{totalDuration} min</span>
          {' · '}{group.appointments?.length} {group.appointments?.length === 1 ? 'servicio' : 'servicios'}
        </p>
        {config?.business_timezone && (
          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-ink-3 bg-raised px-2 py-0.5 rounded-full">
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
            {config.business_timezone.replace('America/', '').replace('_', ' ')}
          </span>
        )}
      </div>

      {/* Calendar + Slots — mismo grid que /agendar DateTimePicker */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_1fr] gap-4">

        {/* Calendar */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-5">
            <button
              onClick={() => setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth()-1, 1))}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-ink-3 hover:text-ink hover:bg-raised transition-all cursor-pointer"
              aria-label="Mes anterior"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7"/>
              </svg>
            </button>
            <span className="text-sm font-semibold text-ink capitalize">
              {MONTHS_ES[viewMonth.getMonth()]} {viewMonth.getFullYear()}
            </span>
            <button
              onClick={() => setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth()+1, 1))}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-ink-3 hover:text-ink hover:bg-raised transition-all cursor-pointer"
              aria-label="Mes siguiente"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7"/>
              </svg>
            </button>
          </div>
          <div className="grid grid-cols-7 mb-2">
            {DAYS_ES.map(d => (
              <div key={d} className="text-center text-[12px] font-medium text-ink-3 py-1">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-y-1">
            {cells.map((date, i) => {
              if (!date) return <div key={`e-${i}`} />;
              const disabled = isDisabled(date);
              const isT      = toDateStr(date) === todayStr;
              const isSel    = newDate && toDateStr(date) === toDateStr(newDate);
              return (
                <button
                  key={toDateStr(date)}
                  disabled={disabled}
                  onClick={() => handleSelectDate(date)}
                  className={[
                    'relative h-9 w-full rounded-full text-sm font-medium transition-all duration-150',
                    'focus:outline-none focus:ring-2 focus:ring-gold/30',
                    disabled ? 'text-ink-3/30 cursor-not-allowed' : 'cursor-pointer',
                    isSel    ? 'bg-gold text-on-gold shadow-xs' : '',
                    !isSel && isT && !disabled ? 'text-gold font-semibold' : '',
                    !isSel && !disabled ? 'hover:bg-raised text-ink' : '',
                  ].filter(Boolean).join(' ')}
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

        {/* Slots */}
        <div className="card p-5 min-h-[280px] flex flex-col">

          {/* Spinner de setup: blockedDates aún cargando (evita flash antes del auto-select) */}
          {!newDate && waitingForSetup && (
            <div className="flex-1 flex items-center justify-center"><Spinner size="sm" /></div>
          )}

          {!newDate && !waitingForSetup && (
            <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center">
              <div className="w-12 h-12 rounded-xl bg-raised flex items-center justify-center">
                <svg className="w-5 h-5 text-ink-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5"/>
                </svg>
              </div>
              <p className="text-sm text-ink-3">Selecciona una fecha</p>
            </div>
          )}

          {/* Spinner mientras carga slots o auto-avanza (día sin disponibilidad para el grupo) */}
          {newDate && (isFetching || (exhaustedFlag && !noMoreDates)) && !isError && (
            <div className="flex-1 flex items-center justify-center"><Spinner size="sm" /></div>
          )}

          {newDate && !isFetching && isError && (
            <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center px-2 py-8">
              <div className="w-12 h-12 rounded-xl bg-raised flex items-center justify-center">
                <svg className="w-5 h-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"/>
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-ink">Error al cargar horarios</p>
                <p className="text-xs text-ink-3 mt-1">Verifica tu conexión y elige otro día.</p>
              </div>
            </div>
          )}

          {/* Área de slots: carga completa, sin auto-avance en curso */}
          {newDate && !isFetching && (!exhaustedFlag || noMoreDates) && !isError && (
            <div className="space-y-4 flex-1">
              {availableSlots.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center px-2 py-8">
                  <div className="w-12 h-12 rounded-xl bg-raised flex items-center justify-center">
                    <svg className="w-5 h-5 text-ink-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"/>
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-ink">Sin disponibilidad</p>
                    <p className="text-xs text-ink-3 mt-1">No hay horarios disponibles en las próximas semanas. Intenta seleccionar otra fecha en el calendario.</p>
                  </div>
                </div>
              ) : (
              [['morning','Mañana'], ['afternoon','Tarde'], ['evening','Noche']].map(([key, label]) => {
                const slots = groupedSlots[key];
                if (!slots?.length) return null;
                return (
                  <div key={key}>
                    <p className="label-section mb-2">{label}</p>
                    <div className="grid grid-cols-3 gap-2">
                      {slots.map(slot => {
                        const sel = newTime === slot;
                        return (
                          <button key={slot} onClick={() => setNewTime(slot)}
                            className={[
                              'py-2.5 rounded-xl text-sm font-medium transition-all duration-150 cursor-pointer',
                              'focus:outline-none focus:ring-2 focus:ring-gold/30',
                              sel ? 'bg-gold text-on-gold shadow-xs'
                                  : 'bg-raised text-ink-2 hover:bg-edge hover:text-ink active:scale-[0.97]',
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

      {/* Cronograma — aparece cuando se selecciona hora */}
      {cronograma && (
        <div className="mt-4 card px-4 py-3.5">
          <p className="label-section mb-3">Cronograma del nuevo horario</p>
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
                            ? <img src={specialist.avatarUrl} alt={appt.specialistName} className="w-full h-full object-cover"/>
                            : <span className="text-[10px] font-bold text-gold">{initials(appt.specialistName)}</span>
                          }
                        </div>
                        <div className="min-w-0">
                          <p className="text-[12px] font-semibold text-ink leading-snug truncate">{toTitleCase(appt.serviceName)}</p>
                          <p className="text-[11px] text-ink-3 truncate">{toTitleCase(appt.specialistName)}</p>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-[12px] font-bold text-gold tabular-nums">{formatTime(appt.startStr, timeFmt)}</p>
                        <p className="text-[11px] text-ink-3">{appt.serviceDuration} min</p>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="pt-2.5 border-t border-edge flex justify-between text-xs">
            <span className="text-ink-3">Total</span>
            <div className="text-right">
              <span className="font-semibold text-ink tabular-nums">
                {totalDuration} min · {(() => {
                  const appts = group.appointments ?? [];
                  const allAsk = appts.every(a => a.priceType === 'ask');
                  const hasVar = appts.some(a => a.priceType === 'ask' || a.priceType === 'range' || a.priceType === 'starting_from');
                  if (allAsk) return 'A consultar';
                  if (hasVar) return `${formatPrice(group.totalPrice)}+`;
                  return formatPrice(group.totalPrice);
                })()}
              </span>
              {Number(group.totalDiscount) > 0 && (
                <p className="text-[11px] font-semibold text-gold tabular-nums">
                  Incluye ahorro de {formatPrice(group.totalDiscount)} por promoción
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Confirm — mismo lugar que /agendar */}
      {newDate && newTime && (
        <div className="mt-4">
          <Button onClick={handleConfirm} loading={isLoading} className="w-full sm:w-auto">
            Confirmar nuevo horario
          </Button>
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }) {
  // no_show: mismo label/estilo que AppointmentCard (cita individual) — el
  // backend ahora refleja el no-show total en appointment_groups.status.
  const cls    = { confirmed: 'badge badge-confirmed', completed: 'badge badge-confirmed', cancelled: 'badge badge-cancelled', rescheduled: 'badge badge-rescheduled', no_show: 'badge badge-noshow' };
  const labels = { confirmed: 'Confirmada', completed: 'Completada', cancelled: 'Cancelada', rescheduled: 'Reagendada', no_show: 'No asistió' };
  return <span className={cls[status] || 'badge'}>{labels[status] || status}</span>;
}
