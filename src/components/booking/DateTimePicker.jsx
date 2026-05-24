import { useState } from 'react';
import { useBooking } from '../../context/BookingContext';
import { isGroupMode } from '../../context/BookingContext';
import { useAvailability, useGroupAvailability, useBlockedDates } from '../../hooks/useAvailability';
import { useConfig } from '../../hooks/useConfig';
import { formatTime, generateSlots, groupSlots, toTitleCase } from '../../utils/formatters';
import Spinner from '../ui/Spinner';
import Button from '../ui/Button';
import { BackButton } from './SpecialistSelector';

const MONTHS_ES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
const DAYS_ES   = ['Do','Lu','Ma','Mi','Ju','Vi','Sá'];

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

// A slot is busy if [slotStart, slotStart+duration) overlaps any existing appointment
// [apptStart, apptEnd) — standard interval overlap: s < e2 && s+d > s2.
// appointmentIntervals = [{startMin, endMin}] already extended by bufferMins on the API.
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

  // ── Calendar bounds ───────────────────────────────────────────────────────
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const maxAdvance    = config?.max_advance_days   ?? 30;
  const maxDate = new Date(today); maxDate.setDate(maxDate.getDate() + maxAdvance);

  const [viewMonth,    setViewMonth]    = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedTime, setSelectedTime] = useState(null);

  const timeFmt  = config?.time_format ?? '12h';

  // config.hours is now { [branchId]: [...7 rows] } — extract for the selected branch
  const branchId = state.branch?.id;
  const hoursMap = config?.hours ?? {};
  const bizHours = branchId && hoursMap[String(branchId)]
    ? hoursMap[String(branchId)]
    : (Array.isArray(hoursMap) ? hoursMap : Object.values(hoursMap)[0] ?? []);

  const selectedServices  = state.services ?? [];
  const groupMode = isGroupMode(state);

  // Group mode: one specialist per service; use the group availability endpoint.
  // Single mode: use the standard availability endpoint per specialist.
  const groupAssignments = groupMode
    ? state.serviceAssignments.map(a => ({ serviceId: a.service.id, specialistId: a.specialist.id }))
    : null;
  const serviceIdsParam = !groupMode && selectedServices.length > 0
    ? selectedServices.map(s => s.id).join(',')
    : null;

  const dateStr = selectedDate ? toDateStr(selectedDate) : null;
  const singleSpecialistId = groupMode ? null : state.specialist?.id;
  const { data: availData,      isFetching,       isError: availError }      = useAvailability(dateStr, singleSpecialistId, branchId, null, null, serviceIdsParam);
  const { data: groupAvailData, isFetching: gFetching, isError: groupAvailError } = useGroupAvailability(groupMode ? dateStr : null, groupAssignments, branchId);

  const monthStr = `${viewMonth.getFullYear()}-${String(viewMonth.getMonth()+1).padStart(2,'0')}`;
  const { data: blockedData } = useBlockedDates(monthStr, state.specialist?.id);
  const blockedDates = blockedData?.blockedDates || [];

  // In group mode use the group availability response; otherwise the single endpoint
  const activeData        = groupMode ? groupAvailData : availData;
  const activeFetching    = groupMode ? gFetching      : isFetching;
  const activeError       = groupMode ? groupAvailError : availError;

  const liveConfig          = activeData?.config || {};
  const timezone            = liveConfig.timezone || config?.business_timezone || null;
  // Group mode returns availableSlots[] directly; single mode returns appointmentIntervals[]
  const appointmentIntervals = (!groupMode && activeData?.appointmentIntervals) || [];
  const groupAvailableSlots  = (groupMode  && activeData?.availableSlots)       || null;
  const staffBlocked         = !groupMode && activeData?.staffBlocked;

  // ── Expert: Prioritize live config from avoid refresh issues ──────
  const intervalMins  = liveConfig.interval   || config?.slot_interval_mins || 30;
  const leadMins      = liveConfig.leadMins   || config?.booking_lead_mins  || 60;
  const bufferMins    = liveConfig.bufferMins || 0;

  // Days with is_open === false → disabled in calendar
  const daysClosed = bizHours.length > 0
    ? bizHours.filter(h => !h.is_open).map(h => h.day_of_week)
    : [0]; 

  function getDayEntry(date) {
    if (!date) return null;
    const entry = bizHours.find(h => h.day_of_week === date.getDay());
    return entry ?? null;
  }

  // ── Handled above ──

  // ── Slot generation for selected day ─────────────────────────────────────
  // In group mode, totalDuration comes from resolved assignments; otherwise from selected services.
  const duration = groupMode
    ? (state.serviceAssignments.reduce((sum, a) => sum + (a.service.duration || 0), 0) || 30)
    : (selectedServices.reduce((sum, s) => sum + (s.duration || 0), 0) || 30);
  const dayEntry  = getDayEntry(selectedDate);
  const openTime  = liveConfig.openTime  || dayEntry?.open_time  || '9:00';
  const closeTime = liveConfig.closeTime || dayEntry?.close_time || '19:00';
  // In group mode the backend returns available slots directly (pre-filtered).
  // In single mode we generate slots locally and filter with appointmentIntervals.
  const allSlots = groupMode
    ? (groupAvailableSlots ?? [])
    : (selectedDate ? generateSlots(openTime, closeTime, duration, intervalMins, bufferMins) : []);
  const grouped   = groupSlots(allSlots);

  // ── Past-slot validation ──────────────────────────────────────────────────
  const now          = new Date();
  const todayStr     = toDateStr(today);
  const isSelectedToday = !!selectedDate && toDateStr(selectedDate) === todayStr;
  const cutoffMins   = now.getHours() * 60 + now.getMinutes() + leadMins;

  function isSlotPast(slot) {
    return isSelectedToday && slotToMinutes(slot) <= cutoffMins;
  }
  const closeMinsForExhaust = slotToMinutes(closeTime);
  // Group mode: backend already excludes busy/past slots; just check past for today
  const allSlotsExhausted = allSlots.length > 0 && allSlots.every(s =>
    isSlotPast(s) || (!groupMode && isSlotBusy(s, duration, appointmentIntervals, closeMinsForExhaust))
  );

  // ── Calendar helpers ──────────────────────────────────────────────────────
  const firstDay    = viewMonth.getDay();
  const daysInMonth = new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(viewMonth.getFullYear(), viewMonth.getMonth(), d));

  function isDayDisabled(d) {
    if (d < today || d > maxDate) return true;
    if (daysClosed.includes(d.getDay())) return true;
    const dateStr = toDateStr(d);
    if (blockedDates.includes(dateStr)) return true;
    if (blockedDates.includes(`recurring:${d.getDay()}`)) return true;
    return false;
  }

  function handleSelectDate(date) {
    setSelectedDate(date);
    setSelectedTime(null);
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="animate-fade-up">
      <BackButton onClick={() => dispatch({ type: 'GO_BACK' })} />
      <div className="mb-7">
        <h2 className="font-display text-2xl font-semibold text-ink tracking-tight">Elige fecha y hora</h2>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1">
          <p className="text-ink-3 text-sm">
            Con <span className="text-ink font-medium">{toTitleCase(state.specialist?.name)}</span>
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

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_1fr] gap-4">

        {/* ── Calendar ───────────────────────────────────────────────────── */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-5">
            <button
              onClick={() => setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth()-1, 1))}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-ink-3 hover:text-ink hover:bg-raised transition-all cursor-pointer"
              aria-label="Mes anterior"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7"/></svg>
            </button>
            <span className="text-sm font-semibold text-ink capitalize">
              {MONTHS_ES[viewMonth.getMonth()]} {viewMonth.getFullYear()}
            </span>
            <button
              onClick={() => setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth()+1, 1))}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-ink-3 hover:text-ink hover:bg-raised transition-all cursor-pointer"
              aria-label="Mes siguiente"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7"/></svg>
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
                    disabled    ? 'text-ink-3/30 cursor-not-allowed' : 'cursor-pointer',
                    isSelected  ? 'bg-gold text-on-gold shadow-xs' : '',
                    !isSelected && isToday  && !disabled ? 'text-gold font-semibold' : '',
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

        {/* ── Time slots ─────────────────────────────────────────────────── */}
        <div className="card p-5 min-h-[280px] flex flex-col">

          {!selectedDate && (
            <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center">
              <div className="w-12 h-12 rounded-xl bg-raised flex items-center justify-center">
                <svg className="w-5 h-5 text-ink-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5"/>
                </svg>
              </div>
              <p className="text-sm text-ink-3">Selecciona una fecha</p>
            </div>
          )}

          {selectedDate && activeFetching && (
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
                <p className="text-xs text-ink-3 mt-1">Verifica tu conexión y elige otro día para reintentar.</p>
              </div>
            </div>
          )}

          {selectedDate && !activeFetching && !activeError && staffBlocked && (
            <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center px-2">
              <div className="w-12 h-12 rounded-xl bg-raised flex items-center justify-center">
                <svg className="w-5 h-5 text-ink-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728v.474A6 6 0 015.636 20.636m-7.07 1.029a6 6 0 01-8.485 0"/>
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-ink">Día no disponible</p>
                <p className="text-xs text-ink-3 mt-1">
                  {staffBlocked.reason || 'El especialista no estará disponible este día.'}
                </p>
              </div>
            </div>
          )}

          {selectedDate && !activeFetching && !activeError && !staffBlocked && (
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

              {allSlots.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center px-2 py-8">
                  <div className="w-12 h-12 rounded-xl bg-raised flex items-center justify-center">
                    <svg className="w-5 h-5 text-ink-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"/>
                    </svg>
                  </div>
                  <p className="text-sm text-ink-3">Sin horarios disponibles para este día</p>
                </div>
              ) : allSlotsExhausted ? (
                <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center px-2 py-8">
                  <div className="w-12 h-12 rounded-xl bg-raised flex items-center justify-center">
                    <svg className="w-5 h-5 text-ink-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/>
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-ink">Sin disponibilidad</p>
                    <p className="text-xs text-ink-3 mt-1">Todos los horarios de este día están ocupados. Elige otra fecha.</p>
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
                          // Group mode: backend already pre-filtered busy slots
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
