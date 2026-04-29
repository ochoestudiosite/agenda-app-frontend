import { useState } from 'react';
import { useBooking } from '../../context/BookingContext';
import { useAvailability } from '../../hooks/useAvailability';
import { formatTime, generateSlots, groupSlots } from '../../utils/formatters';
import Spinner from '../ui/Spinner';
import Button from '../ui/Button';
import { BackButton } from './SpecialistSelector';

const DAYS_CLOSED = [0];
const MAX_ADVANCE  = 30;
const MONTHS_ES    = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
const DAYS_ES      = ['Do','Lu','Ma','Mi','Ju','Vi','Sá'];

function toDateStr(d) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

export default function DateTimePicker() {
  const { state, dispatch } = useBooking();
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const maxDate = new Date(today); maxDate.setDate(maxDate.getDate() + MAX_ADVANCE);

  const [viewMonth,    setViewMonth]    = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedTime, setSelectedTime] = useState(null);

  const dateStr    = selectedDate ? toDateStr(selectedDate) : null;
  const { data: availData, isFetching } = useAvailability(dateStr);
  const busySlots  = availData?.busySlots || [];
  const allSlots   = generateSlots(9, 19, state.service?.duration || 30);
  const grouped    = groupSlots(allSlots);

  const firstDay   = viewMonth.getDay();
  const daysInMonth = new Date(viewMonth.getFullYear(), viewMonth.getMonth()+1, 0).getDate();
  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(viewMonth.getFullYear(), viewMonth.getMonth(), d));

  function isDisabled(d) { return d < today || d > maxDate || DAYS_CLOSED.includes(d.getDay()); }

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

        {/* Calendar */}
        <div className="card p-5">
          {/* Month nav */}
          <div className="flex items-center justify-between mb-5">
            <button
              onClick={() => setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth()-1, 1))}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-ink-3 hover:text-ink hover:bg-raised transition-all cursor-pointer"
              aria-label="Mes anterior"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
            </button>
            <span className="text-sm font-semibold text-ink capitalize">
              {MONTHS_ES[viewMonth.getMonth()]} {viewMonth.getFullYear()}
            </span>
            <button
              onClick={() => setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth()+1, 1))}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-ink-3 hover:text-ink hover:bg-raised transition-all cursor-pointer"
              aria-label="Mes siguiente"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
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
              const disabled   = isDisabled(date);
              const isToday    = toDateStr(date) === toDateStr(today);
              const isSelected = selectedDate && toDateStr(date) === toDateStr(selectedDate);
              return (
                <button
                  key={toDateStr(date)}
                  disabled={disabled}
                  onClick={() => { setSelectedDate(date); setSelectedTime(null); }}
                  className={[
                    'relative h-9 w-full rounded-lg text-sm font-medium transition-all duration-160',
                    disabled ? 'text-ink-3/30 cursor-not-allowed' : 'cursor-pointer',
                    isSelected ? 'bg-gold text-on-gold shadow-xs' : '',
                    !isSelected && isToday && !disabled ? 'text-gold font-semibold' : '',
                    !isSelected && !disabled ? 'hover:bg-raised text-ink' : '',
                    !isSelected && !isToday && !disabled ? '' : '',
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

        {/* Time slots */}
        <div className="card p-5 min-h-[280px] flex flex-col">
          {!selectedDate ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center">
              <div className="w-12 h-12 rounded-xl bg-raised flex items-center justify-center">
                <svg className="w-5 h-5 text-ink-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
                </svg>
              </div>
              <p className="text-sm text-ink-3">Selecciona una fecha</p>
            </div>
          ) : isFetching ? (
            <div className="flex-1 flex items-center justify-center">
              <Spinner size="sm" />
            </div>
          ) : (
            <div className="space-y-4 flex-1">
              {Object.entries({ morning: 'Mañana', afternoon: 'Tarde', evening: 'Noche' }).map(([key, label]) => {
                const slots = grouped[key];
                if (!slots.length) return null;
                return (
                  <div key={key}>
                    <p className="label-section mb-2.5">{label}</p>
                    <div className="grid grid-cols-3 gap-2">
                      {slots.map(slot => {
                        const busy = busySlots.includes(slot);
                        const sel  = selectedTime === slot;
                        return (
                          <button
                            key={slot}
                            disabled={busy}
                            onClick={() => setSelectedTime(slot)}
                            className={[
                              'py-2.5 rounded-xl text-xs font-medium transition-all duration-160',
                              busy ? 'text-ink-3/40 line-through cursor-not-allowed bg-raised/50'
                                   : 'cursor-pointer',
                              sel  ? 'bg-gold text-on-gold shadow-xs'
                                   : !busy ? 'bg-raised text-ink-2 hover:bg-edge hover:text-ink active:scale-[0.97]'
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

      {selectedDate && selectedTime && (
        <div className="mt-6 flex justify-end animate-fade-in">
          <Button
            size="lg"
            onClick={() => dispatch({ type: 'SET_DATETIME', payload: { date: dateStr, time: selectedTime } })}
          >
            Continuar
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </Button>
        </div>
      )}
    </div>
  );
}
