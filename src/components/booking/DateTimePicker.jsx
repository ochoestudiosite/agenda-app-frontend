import { useState } from 'react';
import { useBooking } from '../../context/BookingContext';
import { useAvailability } from '../../hooks/useAvailability';
import { formatTime, generateSlots, groupSlots } from '../../utils/formatters';
import Spinner from '../ui/Spinner';
import Button from '../ui/Button';
import { BackButton } from './SpecialistSelector';

const DAYS_CLOSED       = [0];         // 0 = Sunday
const MAX_ADVANCE       = 30;          // days
const MIN_BOOKING_BUFFER = 60;         // minutes: earliest bookable = now + 60 min
const MONTHS_ES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
const DAYS_ES   = ['Do','Lu','Ma','Mi','Ju','Vi','Sá'];

function toDateStr(d) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function slotToMinutes(slot) {
  const [h, m] = slot.split(':').map(Number);
  return h * 60 + m;
}

export default function DateTimePicker() {
  const { state, dispatch } = useBooking();

  // today at midnight (for calendar disabled logic)
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const maxDate = new Date(today); maxDate.setDate(maxDate.getDate() + MAX_ADVANCE);

  const [viewMonth,    setViewMonth]    = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedTime, setSelectedTime] = useState(null);

  const dateStr = selectedDate ? toDateStr(selectedDate) : null;
  const { data: availData, isFetching } = useAvailability(dateStr);
  const busySlots = availData?.busySlots || [];

  const duration = state.service?.duration || 30;
  const allSlots = generateSlots(9, 19, duration);
  const grouped  = groupSlots(allSlots);

  // ── Past-slot validation ──────────────────────────────────────────────────
  // Re-evaluates on every render (so it stays accurate during long sessions)
  const now = new Date();
  const todayStr = toDateStr(today);
  const isSelectedToday = !!selectedDate && toDateStr(selectedDate) === todayStr;

  // Cutoff = current time + booking buffer (in minutes from midnight)
  const cutoffMins = now.getHours() * 60 + now.getMinutes() + MIN_BOOKING_BUFFER;

  function isSlotPast(slot) {
    // Only applies when the selected date is today
    return isSelectedToday && slotToMinutes(slot) <= cutoffMins;
  }

  // True if today is selected but every slot has already passed
  const allSlotsExhausted = isSelectedToday && allSlots.every(s => isSlotPast(s) || busySlots.includes(s));

  // ── Calendar helpers ──────────────────────────────────────────────────────
  const firstDay    = viewMonth.getDay();
  const daysInMonth = new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(viewMonth.getFullYear(), viewMonth.getMonth(), d));

  function isDayDisabled(d) {
    return d < today || d > maxDate || DAYS_CLOSED.includes(d.getDay());
  }

  function handleSelectDate(date) {
    setSelectedDate(date);
    setSelectedTime(null); // always clear time when date changes
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="animate-fade-up">
      <BackButton onClick={() => dispatch({ type: 'GO_BACK' })} />
      <div className="mb-7">
        <h2 className="font-display text-2xl font-semibold text-ink tracking-tight">Elige fecha y hora</h2>
        <p className="text-ink-3 text-sm mt-1">
          Con <span className="text-ink font-medium">{state.specialist?.name}</span>
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_1fr] gap-4">

        {/* ── Calendar ─────────────────────────────────────────────────── */}
        <div className="card p-5">
          {/* Month nav */}
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

          {/* Day headers */}
          <div className="grid grid-cols-7 mb-2">
            {DAYS_ES.map(d => (
              <div key={d} className="text-center text-[0.6875rem] font-medium text-ink-3 py-1">{d}</div>
            ))}
          </div>

          {/* Day grid */}
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

        {/* ── Time slots ───────────────────────────────────────────────── */}
        <div className="card p-5 min-h-[280px] flex flex-col">

          {/* No date selected */}
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

          {/* Loading */}
          {selectedDate && isFetching && (
            <div className="flex-1 flex items-center justify-center">
              <Spinner size="sm" />
            </div>
          )}

          {/* All slots exhausted for today */}
          {selectedDate && !isFetching && allSlotsExhausted && (
            <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center px-2">
              <div className="w-12 h-12 rounded-xl bg-raised flex items-center justify-center">
                <svg className="w-5 h-5 text-ink-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-ink">Sin horarios disponibles hoy</p>
                <p className="text-xs text-ink-3 mt-1">Los horarios de hoy ya pasaron.<br/>Selecciona otra fecha para continuar.</p>
              </div>
            </div>
          )}

          {/* Slot grid */}
          {selectedDate && !isFetching && !allSlotsExhausted && (
            <div className="space-y-4 flex-1">

              {/* Today's buffer hint */}
              {isSelectedToday && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-gold/8 border border-gold/20">
                  <svg className="w-3.5 h-3.5 text-gold shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"/>
                  </svg>
                  <p className="text-xs text-gold font-medium">
                    Solo horarios con al menos {MIN_BOOKING_BUFFER} min de anticipación
                  </p>
                </div>
              )}

              {Object.entries({ morning: 'Mañana', afternoon: 'Tarde', evening: 'Noche' }).map(([key, label]) => {
                const slots = grouped[key];
                if (!slots.length) return null;

                // Filter out all-past+busy groups so we don't render an empty section
                const hasAvailable = slots.some(s => !isSlotPast(s) && !busySlots.includes(s));
                const allGone      = slots.every(s => isSlotPast(s) || busySlots.includes(s));
                if (allGone) return null;

                return (
                  <div key={key}>
                    <p className="label-section mb-2.5">{label}</p>
                    <div className="grid grid-cols-3 gap-2">
                      {slots.map(slot => {
                        const past = isSlotPast(slot);
                        const busy = busySlots.includes(slot);
                        const sel  = selectedTime === slot;
                        const unavailable = past || busy;

                        return (
                          <button
                            key={slot}
                            disabled={unavailable}
                            onClick={() => setSelectedTime(slot)}
                            aria-label={
                              past ? `${formatTime(slot)} — horario pasado` :
                              busy ? `${formatTime(slot)} — no disponible` :
                              formatTime(slot)
                            }
                            className={[
                              'py-2.5 rounded-xl text-xs font-medium transition-all duration-160 relative',
                              // Past: muted gray, no interaction
                              past && !busy
                                ? 'text-ink-3/35 bg-raised/40 cursor-not-allowed'
                                : '',
                              // Busy/taken: strikethrough
                              busy
                                ? 'text-ink-3/40 line-through bg-raised/50 cursor-not-allowed'
                                : '',
                              // Selected
                              sel && !unavailable
                                ? 'bg-gold text-on-gold shadow-xs'
                                : '',
                              // Available
                              !unavailable && !sel
                                ? 'bg-raised text-ink-2 hover:bg-edge hover:text-ink active:scale-[0.97] cursor-pointer'
                                : '',
                            ].join(' ')}
                          >
                            {formatTime(slot)}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Continue CTA — only when a valid future slot is selected */}
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
