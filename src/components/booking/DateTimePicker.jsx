import { useState, useEffect, useRef } from 'react';
import { useBooking } from '../../context/BookingContext';
import { isGroupMode } from '../../context/BookingContext';
import { useAvailability, useGroupAvailability, useBlockedDates } from '../../hooks/useAvailability';
import { useConfig } from '../../hooks/useConfig';
import { formatTime, generateSlots, groupSlots, toTitleCase } from '../../utils/formatters';
import Spinner from '../ui/Spinner';
import Button from '../ui/Button';
import { BackButton } from './SpecialistSelector';

const MONTHS_ES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
const DAYS_ES   = ['Lu','Ma','Mi','Ju','Vi','Sá','Do'];

function toDateStr(d) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}
function slotToMinutes(slot) {
  if (!slot) return 0;
  const [h, m] = slot.split(':').map(Number);
  return h * 60 + m;
}
function minutesToSlot(mins) {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${h}:${String(m).padStart(2, '0')}`;
}

/**
 * Encuentra la próxima fecha con disponibilidad potencial.
 * Salta: días pasados, días cerrados del negocio, fechas bloqueadas.
 * "Potencialmente disponible" = no estructuralmente bloqueado.
 * La verificación de slots ocupados ocurre al seleccionar la fecha.
 */
function findNextAvailableDate({ bizHours = [], blockedDates = [], leadMins = 60, maxAdvanceDays = 30 }) {
  const now = new Date();
  const nowMins = now.getHours() * 60 + now.getMinutes();
  const closedDays = new Set(bizHours.filter(h => !h.is_open).map(h => h.day_of_week));

  // ¿Hoy tiene tiempo restante suficiente?
  const todayEntry = bizHours.find(h => h.day_of_week === now.getDay());
  const closeMins  = todayEntry ? (() => {
    const [ch, cm] = (todayEntry.close_time || '19:00').split(':').map(Number);
    return ch * 60 + cm;
  })() : 19 * 60;

  const tooLate = !todayEntry || !todayEntry.is_open || (nowMins + leadMins + 30 >= closeMins);

  const candidate = new Date(now);
  candidate.setHours(0, 0, 0, 0);
  if (tooLate) candidate.setDate(candidate.getDate() + 1);

  for (let i = 0; i <= maxAdvanceDays + 7; i++) {
    const ds = toDateStr(candidate);
    const dow = candidate.getDay();
    if (!closedDays.has(dow) && !blockedDates.includes(ds) && !blockedDates.includes(`recurring:${dow}`)) {
      return new Date(candidate);
    }
    candidate.setDate(candidate.getDate() + 1);
  }
  return null;
}

function isSlotBusy(slot, duration, appointmentIntervals, closeTimeMins) {
  const start = slotToMinutes(slot);
  const end   = start + duration;
  if (end > closeTimeMins) return true;
  return appointmentIntervals.some(({ startMin, endMin }) =>
    start < endMin && end > startMin
  );
}

export default function DateTimePicker() {
  const { state, dispatch } = useBooking();
  const { data: config }   = useConfig();

  const today = new Date(); today.setHours(0, 0, 0, 0);
  const maxAdvance = config?.max_advance_days ?? 30;
  const maxDate    = new Date(today); maxDate.setDate(maxDate.getDate() + maxAdvance);

  const [viewMonth,    setViewMonth]    = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedTime, setSelectedTime] = useState(null);
  const [noMoreDates,  setNoMoreDates]  = useState(false); // true cuando el auto-avance agotó todas las opciones
  const autoSelectedRef      = useRef(false);
  const skippedDatesRef      = useRef(new Set());
  const autoAdvanceCountRef  = useRef(0);
  const MAX_AUTO_ADVANCES    = 7;

  const timeFmt  = config?.time_format ?? '12h';
  const branchId = state.branch?.id;
  const hoursMap = config?.hours ?? {};
  const bizHours = branchId && hoursMap[String(branchId)]
    ? hoursMap[String(branchId)]
    : (Array.isArray(hoursMap) ? hoursMap : Object.values(hoursMap)[0] ?? []);

  const selectedServices = state.services ?? [];
  const groupMode        = isGroupMode(state);

  const groupAssignments = groupMode
    ? state.serviceAssignments.map(a => ({ serviceId: a.service.id, specialistId: a.specialist.id }))
    : null;
  const serviceIdsParam = !groupMode && selectedServices.length > 0
    ? selectedServices.map(s => s.id).join(',')
    : null;

  const dateStr            = selectedDate ? toDateStr(selectedDate) : null;
  const singleSpecialistId = groupMode ? null : state.specialist?.id;
  const { data: availData,      isFetching,       isError: availError }      = useAvailability(dateStr, singleSpecialistId, branchId, null, null, serviceIdsParam);
  const { data: groupAvailData, isFetching: gFetching, isError: groupAvailError } = useGroupAvailability(groupMode ? dateStr : null, groupAssignments, branchId);

  const groupSpecialistIds = groupMode
    ? [...new Set(state.serviceAssignments.map(a => a.specialist.id))].join(',')
    : null;

  const monthStr = `${viewMonth.getFullYear()}-${String(viewMonth.getMonth()+1).padStart(2,'0')}`;
  const { data: blockedData } = useBlockedDates(monthStr, groupMode ? null : state.specialist?.id, branchId, groupSpecialistIds);
  const blockedDates = blockedData?.blockedDates || [];

  const activeData       = groupMode ? groupAvailData : availData;
  const activeFetching   = groupMode ? gFetching      : isFetching;
  const activeError      = groupMode ? groupAvailError : availError;

  const liveConfig           = activeData?.config || {};
  const timezone             = liveConfig.timezone || config?.business_timezone || null;
  const appointmentIntervals = (!groupMode && activeData?.appointmentIntervals) || [];
  const groupAvailableSlots  = (groupMode  && activeData?.availableSlots)       || null;
  const staffBlocked         = activeData?.staffBlocked;
  const staffBlockedFlag     = !!staffBlocked?.blocked;
  const businessClosedFlag   = !!activeData?.businessClosed?.closed;
  // Unifica ambas condiciones de "día estructuralmente no disponible" —
  // ni vacaciones de especialista ni cierres del negocio llegan al cliente.
  const anyDaySkipFlag       = staffBlockedFlag || businessClosedFlag;

  const intervalMins       = liveConfig.interval   || config?.slot_interval_mins || 30;
  const leadMins           = liveConfig.leadMins   || config?.booking_lead_mins  || 60;
  const bufferMins         = liveConfig.bufferMins || 0;

  const daysClosed = bizHours.length > 0
    ? bizHours.filter(h => !h.is_open).map(h => h.day_of_week)
    : [0];

  function getDayEntry(date) {
    if (!date) return null;
    return bizHours.find(h => h.day_of_week === date.getDay()) ?? null;
  }

  const duration = groupMode
    ? (state.serviceAssignments.reduce((sum, a) => sum + (a.service.duration || 0), 0) || 30)
    : (selectedServices.reduce((sum, s) => sum + (s.duration || 0), 0) || 30);

  const dayEntry  = getDayEntry(selectedDate);
  const openTime  = liveConfig.openTime  || dayEntry?.open_time  || '9:00';
  const closeTime = liveConfig.closeTime || dayEntry?.close_time || '19:00';

  const allSlots = groupMode
    ? (groupAvailableSlots ?? [])
    : (selectedDate ? generateSlots(openTime, closeTime, duration, intervalMins, bufferMins) : []);
  const grouped = groupSlots(allSlots);

  const now             = new Date();
  const todayStr        = toDateStr(today);
  const isSelectedToday = !!selectedDate && toDateStr(selectedDate) === todayStr;
  const cutoffMins      = now.getHours() * 60 + now.getMinutes() + leadMins;

  function isSlotPast(slot) {
    return isSelectedToday && slotToMinutes(slot) <= cutoffMins;
  }
  const closeMinsForExhaust = slotToMinutes(closeTime);
  const allSlotsExhausted   = allSlots.length > 0 && allSlots.every(s =>
    isSlotPast(s) || (!groupMode && isSlotBusy(s, duration, appointmentIntervals, closeMinsForExhaust))
  );

  // true cuando el día está resuelto (no cargando, no error, no bloqueado) pero sin slots
  const exhaustedFlag    = !!(selectedDate && !activeFetching && !activeError && !anyDaySkipFlag &&
    (allSlots.length === 0 || allSlotsExhausted));
  // true mientras config u horarios bloqueados aún no cargan (evita flash de "Selecciona una fecha")
  const waitingForSetup  = !config || !blockedData;

  const firstDay    = (viewMonth.getDay() + 6) % 7; // 0=Lunes … 6=Domingo
  const daysInMonth = new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(viewMonth.getFullYear(), viewMonth.getMonth(), d));

  function isDayDisabled(d) {
    if (d < today || d > maxDate) return true;
    if (daysClosed.includes(d.getDay())) return true;
    const ds = toDateStr(d);
    if (blockedDates.includes(ds)) return true;
    if (blockedDates.includes(`recurring:${d.getDay()}`)) return true;
    return false;
  }

  // ── Auto-selección del próximo día disponible ─────────────────────────────
  // Se ejecuta cuando cargan bizHours y blockedDates.
  // Si el día actual ya no tiene slots posibles (tarde + leadMins), salta al
  // siguiente día hábil. Nunca sobreescribe una selección manual del usuario.
  useEffect(() => {
    if (autoSelectedRef.current || selectedDate || bizHours.length === 0 || !blockedData) return;
    const next = findNextAvailableDate({
      bizHours,
      blockedDates,
      leadMins,
      maxAdvanceDays: maxAdvance,
    });
    if (next) {
      autoSelectedRef.current = true;
      setSelectedDate(next);
      setViewMonth(new Date(next.getFullYear(), next.getMonth(), 1));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bizHours.length, blockedDates.length, leadMins, !!blockedData]);

  // Auto-avance cuando staffBlocked o businessClosed — el cliente nunca ve el motivo interno.
  useEffect(() => {
    if (!anyDaySkipFlag || !selectedDate || activeFetching) return;
    skippedDatesRef.current.add(toDateStr(selectedDate));
    const next = findNextAvailableDate({
      bizHours,
      blockedDates: [...blockedDates, ...skippedDatesRef.current],
      leadMins: 0,
      maxAdvanceDays: maxAdvance,
    });
    if (next) {
      setSelectedDate(next);
      setViewMonth(new Date(next.getFullYear(), next.getMonth(), 1));
      setSelectedTime(null);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [anyDaySkipFlag, activeFetching]);

  // Auto-avance cuando el día no tiene slots (agendados/pasados/sin horario).
  // Limitado a MAX_AUTO_ADVANCES para no encadenar decenas de llamadas al API.
  // noMoreDates=true cuando se agota el límite o findNextAvailableDate regresa null.
  useEffect(() => {
    if (!exhaustedFlag || !selectedDate) return;
    if (autoAdvanceCountRef.current >= MAX_AUTO_ADVANCES) {
      setNoMoreDates(true); // límite alcanzado — muestra "Sin disponibilidad"
      return;
    }
    setNoMoreDates(false);
    autoAdvanceCountRef.current++;
    skippedDatesRef.current.add(toDateStr(selectedDate));
    const next = findNextAvailableDate({
      bizHours,
      blockedDates: [...blockedDates, ...skippedDatesRef.current],
      leadMins: 0,
      maxAdvanceDays: maxAdvance,
    });
    if (next) {
      setSelectedDate(next);
      setViewMonth(new Date(next.getFullYear(), next.getMonth(), 1));
      setSelectedTime(null);
    } else {
      setNoMoreDates(true); // sin fechas estructurales disponibles
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [exhaustedFlag]);

  function handleSelectDate(date) {
    autoSelectedRef.current = true;
    autoAdvanceCountRef.current = 0;
    setNoMoreDates(false);
    setSelectedDate(date);
    setSelectedTime(null);
  }

  // Group breakdown: compute each service's time window
  const groupBreakdown = groupMode && selectedTime
    ? state.serviceAssignments.map((a, i) => {
        const offsetMins = state.serviceAssignments.slice(0, i).reduce((sum, prev) => sum + (prev.service.duration || 0), 0);
        const startMins  = slotToMinutes(selectedTime) + offsetMins;
        const endMins    = startMins + (a.service.duration || 0);
        return { ...a, startMins, endMins, isLast: i === state.serviceAssignments.length - 1 };
      })
    : null;

  // Group specialist subtitle
  const specialistLabel = groupMode
    ? state.serviceAssignments.map(a => toTitleCase(a.specialist.name)).join(' · ')
    : toTitleCase(state.specialist?.name);

  return (
    <div className="animate-fade-up">
      <BackButton onClick={() => dispatch({ type: 'GO_BACK' })} />

      {/* Header */}
      <div className="mb-7">
        <h2 className="font-display text-2xl font-semibold text-ink tracking-tight">Elige fecha y hora</h2>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1">
          <p className="text-ink-3 text-sm">
            Con <span className="text-ink font-medium">{specialistLabel}</span>
          </p>
          {timezone && (
            <span className="inline-flex items-center gap-1 text-[10px] font-medium text-ink-3 bg-raised px-2 py-0.5 rounded-full">
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
              {timezone.replace('America/', '').replace('_', ' ')}
            </span>
          )}
        </div>
      </div>

      {/* Calendar + Slots grid */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_1fr] gap-4">

        {/* ── Calendar ─────────────────────────────────────────────────────── */}
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
              <div key={d} className="text-center text-[0.6875rem] font-medium text-ink-3 py-1">{d}</div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-y-1">
            {cells.map((date, i) => {
              if (!date) return <div key={`e-${i}`} />;
              const disabled   = isDayDisabled(date);
              const isToday    = toDateStr(date) === todayStr;
              const isSelected = selectedDate && toDateStr(date) === toDateStr(selectedDate);
              return (
                <button
                  key={toDateStr(date)}
                  disabled={disabled}
                  onClick={() => handleSelectDate(date)}
                  className={[
                    'relative h-9 w-full rounded-lg text-sm font-medium transition-all duration-160',
                    disabled   ? 'text-ink-3/30 cursor-not-allowed' : 'cursor-pointer',
                    isSelected ? 'bg-gold text-on-gold shadow-xs' : '',
                    !isSelected && isToday && !disabled ? 'text-gold font-semibold' : '',
                    !isSelected && !disabled ? 'hover:bg-raised text-ink' : '',
                  ].join(' ')}
                >
                  {date.getDate()}
                  {isToday && !isSelected && (
                    <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-gold" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Time slots ───────────────────────────────────────────────────── */}
        <div className="card p-5 min-h-[280px] flex flex-col">

          {/* Spinner de setup: config o blocked-dates aún cargando (evita flash antes del auto-select) */}
          {!selectedDate && waitingForSetup && (
            <div className="flex-1 flex items-center justify-center"><Spinner size="sm" /></div>
          )}

          {/* Solo cuando el setup está completo y no hay fecha aún (el usuario canceló auto-select o no hay días) */}
          {!selectedDate && !waitingForSetup && (
            <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center">
              <div className="w-12 h-12 rounded-xl bg-raised flex items-center justify-center">
                <svg className="w-5 h-5 text-ink-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5"/>
                </svg>
              </div>
              <p className="text-sm text-ink-3">Selecciona una fecha</p>
            </div>
          )}

          {/* Spinner mientras carga slots, auto-avanza (staffBlocked / businessClosed / agendado) */}
          {selectedDate && (activeFetching || anyDaySkipFlag || (exhaustedFlag && !noMoreDates)) && !activeError && (
            <div className="flex-1 flex items-center justify-center"><Spinner size="sm" /></div>
          )}

          {selectedDate && !activeFetching && activeError && (
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

          {/* Área de slots: carga completa, sin bloqueos, sin auto-avance en curso */}
          {selectedDate && !activeFetching && !anyDaySkipFlag && (!exhaustedFlag || noMoreDates) && !activeError && (
            <div className="space-y-4 flex-1">
              {isSelectedToday && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-gold/8 border border-gold/20">
                  <svg className="w-3.5 h-3.5 text-gold shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"/>
                  </svg>
                  <p className="text-xs text-gold font-medium">
                    Solo horarios con al menos {leadMins} min de anticipación
                  </p>
                </div>
              )}

              {allSlots.length === 0 || allSlotsExhausted ? (
                // Solo llega aquí si autoAdvanceCountRef >= MAX_AUTO_ADVANCES (todos los días próximos agendados)
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
                Object.entries({ morning: 'Mañana', afternoon: 'Tarde', evening: 'Noche' }).map(([key, label]) => {
                  const slots = grouped[key];
                  if (!slots?.length) return null;
                  const closeMins = slotToMinutes(closeTime);
                  return (
                    <div key={key}>
                      <p className="label-section mb-2.5">{label}</p>
                      <div className="grid grid-cols-3 gap-2">
                        {slots.map(slot => {
                          const past    = isSlotPast(slot);
                          const busy    = !groupMode && isSlotBusy(slot, duration, appointmentIntervals, closeMins);
                          const sel     = selectedTime === slot;
                          const unavail = past || busy;
                          return (
                            <button
                              key={slot}
                              disabled={unavail}
                              onClick={() => setSelectedTime(slot)}
                              aria-label={
                                past ? `${formatTime(slot, timeFmt)} — horario pasado` :
                                busy ? `${formatTime(slot, timeFmt)} — no disponible` :
                                formatTime(slot, timeFmt)
                              }
                              className={[
                                'py-2.5 rounded-xl text-xs font-medium transition-all duration-160',
                                busy    ? 'text-ink-3/40 line-through bg-raised/50 cursor-not-allowed' : '',
                                past && !busy ? 'text-ink-3/35 bg-raised/40 cursor-not-allowed' : '',
                                sel && !unavail ? 'bg-gold text-on-gold shadow-xs' : '',
                                !unavail && !sel ? 'bg-raised text-ink-2 hover:bg-edge hover:text-ink active:scale-[0.97] cursor-pointer' : '',
                              ].join(' ')}
                            >
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

      {/* ── Group schedule breakdown ─────────────────────────────────────────── */}
      {groupBreakdown && !isSlotPast(selectedTime) && (
        <div className="mt-4 animate-fade-up">
          <div className="card p-5">
            <p className="label-section mb-4">Cronograma de tu visita</p>
            <div>
              {groupBreakdown.map(({ service, specialist, startMins, endMins, isLast }, i) => (
                <div key={service.id || i} className="flex items-start gap-3">
                  {/* Timeline dot + connector */}
                  <div className="w-5 flex flex-col items-center shrink-0 pt-1">
                    <div className="w-2.5 h-2.5 rounded-full bg-gold ring-[3px] ring-gold/20 shrink-0" />
                    {!isLast && <div className="w-px h-8 bg-edge mt-1.5" />}
                  </div>
                  {/* Content */}
                  <div className={`flex-1 min-w-0 flex items-start justify-between gap-2 ${!isLast ? 'pb-3' : ''}`}>
                    <div className="min-w-0">
                      <p className="text-[13px] font-semibold text-ink leading-tight truncate">
                        {toTitleCase(service.name)}
                      </p>
                      <p className="text-[11px] text-ink-3 mt-0.5">
                        {toTitleCase(specialist.name)} · {service.duration} min
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-[12px] font-semibold text-gold tabular-nums whitespace-nowrap">
                        {formatTime(minutesToSlot(startMins), timeFmt)}
                      </p>
                      <p className="text-[11px] text-ink-3 mt-0.5 tabular-nums whitespace-nowrap">
                        hasta {formatTime(minutesToSlot(endMins), timeFmt)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-3 pt-3 border-t border-edge flex items-center justify-between">
              <span className="text-[11px] font-medium text-ink-3">Duración total</span>
              <span className="text-[12px] font-semibold text-ink tabular-nums">
                {state.serviceAssignments.reduce((s, a) => s + (a.service.duration || 0), 0)} min —
                {' terminamos a las '}
                {formatTime(minutesToSlot(slotToMinutes(selectedTime) + state.serviceAssignments.reduce((s, a) => s + (a.service.duration || 0), 0)), timeFmt)}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ── Continue button ──────────────────────────────────────────────────── */}
      {selectedDate && selectedTime && !isSlotPast(selectedTime) && (
        <div className="mt-6 flex justify-end animate-fade-in">
          <Button
            size="lg"
            onClick={() => dispatch({ type: 'SET_DATETIME', payload: { date: dateStr, time: selectedTime } })}
          >
            Continuar
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7"/>
            </svg>
          </Button>
        </div>
      )}
    </div>
  );
}
