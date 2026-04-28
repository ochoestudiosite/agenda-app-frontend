import { useState } from 'react';
import { useBooking } from '../../context/BookingContext';
import { useAvailability } from '../../hooks/useAvailability';
import { formatTime, generateSlots, groupSlots } from '../../utils/formatters';
import Spinner from '../ui/Spinner';
import Button from '../ui/Button';

const DAYS_CLOSED = [0];
const MAX_ADVANCE = 30;
const MONTHS_ES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
const DAYS_ES = ['Do','Lu','Ma','Mi','Ju','Vi','Sá'];

function toDateStr(date) {
  return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
}

export default function DateTimePicker() {
  const { state, dispatch } = useBooking();
  const today = new Date(); today.setHours(0,0,0,0);
  const maxDate = new Date(today); maxDate.setDate(maxDate.getDate() + MAX_ADVANCE);

  const [viewMonth, setViewMonth] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedTime, setSelectedTime] = useState(null);

  const dateStr = selectedDate ? toDateStr(selectedDate) : null;
  const { data: availData, isFetching } = useAvailability(dateStr);
  const busySlots = availData?.busySlots || [];

  const allSlots = generateSlots(9, 19, state.service?.duration || 30);
  const grouped = groupSlots(allSlots);

  function isDateDisabled(date) {
    return date < today || date > maxDate || DAYS_CLOSED.includes(date.getDay());
  }

  const firstDay = viewMonth.getDay();
  const daysInMonth = new Date(viewMonth.getFullYear(), viewMonth.getMonth()+1, 0).getDate();
  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(viewMonth.getFullYear(), viewMonth.getMonth(), d));

  return (
    <div className="animate-slide-up">
      <BackButton onClick={() => dispatch({ type: 'GO_BACK' })} />
      <h2 className="font-display text-2xl font-semibold mb-6 text-ink">Elige fecha y hora</h2>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Calendar */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <button onClick={() => setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth()-1, 1))}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-ink-2 hover:text-ink hover:bg-raised transition-colors cursor-pointer">
              <ChevLeft />
            </button>
            <span className="font-medium text-sm text-ink capitalize">
              {MONTHS_ES[viewMonth.getMonth()]} {viewMonth.getFullYear()}
            </span>
            <button onClick={() => setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth()+1, 1))}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-ink-2 hover:text-ink hover:bg-raised transition-colors cursor-pointer">
              <ChevRight />
            </button>
          </div>

          <div className="grid grid-cols-7 mb-2">
            {DAYS_ES.map(d => <div key={d} className="text-center text-xs text-ink-3 py-1">{d}</div>)}
          </div>

          <div className="grid grid-cols-7 gap-y-1">
            {cells.map((date, i) => {
              if (!date) return <div key={`e-${i}`} />;
              const disabled = isDateDisabled(date);
              const isToday = toDateStr(date) === toDateStr(today);
              const isSelected = selectedDate && toDateStr(date) === toDateStr(selectedDate);
              return (
                <button
                  key={toDateStr(date)}
                  disabled={disabled}
                  onClick={() => { setSelectedDate(date); setSelectedTime(null); }}
                  className={`h-9 w-full rounded-lg text-sm font-medium transition-all duration-150
                    ${disabled ? 'text-ink-3 cursor-not-allowed opacity-40' : 'cursor-pointer hover:bg-raised'}
                    ${isSelected ? 'bg-gold text-on-gold hover:bg-gold-light' : ''}
                    ${isToday && !isSelected ? 'border border-gold/50 text-gold' : ''}
                    ${!isSelected && !isToday && !disabled ? 'text-ink' : ''}
                  `}
                >
                  {date.getDate()}
                </button>
              );
            })}
          </div>
        </div>

        {/* Time slots */}
        <div className="card p-5">
          {!selectedDate ? (
            <div className="flex flex-col items-center justify-center h-full min-h-[200px] gap-3">
              <CalendarIcon />
              <p className="text-ink-3 text-sm">Selecciona una fecha para ver los horarios</p>
            </div>
          ) : isFetching ? (
            <div className="flex justify-center items-center h-full min-h-[200px]"><Spinner /></div>
          ) : (
            <div className="space-y-5">
              {Object.entries({ morning: 'Mañana', afternoon: 'Tarde', evening: 'Noche' }).map(([key, label]) => {
                const slots = grouped[key];
                if (!slots.length) return null;
                return (
                  <div key={key}>
                    <p className="text-xs text-ink-3 uppercase tracking-wider mb-2 font-medium">{label}</p>
                    <div className="grid grid-cols-3 gap-2">
                      {slots.map(slot => {
                        const busy = busySlots.includes(slot);
                        const sel = selectedTime === slot;
                        return (
                          <button
                            key={slot}
                            disabled={busy}
                            onClick={() => setSelectedTime(slot)}
                            className={`py-2 rounded-lg text-sm font-medium transition-all duration-150
                              ${busy ? 'bg-raised text-ink-3 line-through cursor-not-allowed opacity-50' : 'cursor-pointer'}
                              ${sel  ? 'bg-gold text-on-gold' : ''}
                              ${!busy && !sel ? 'bg-raised text-ink-2 hover:border hover:border-gold/50 hover:text-gold' : ''}
                            `}
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
          <Button size="lg" onClick={() => dispatch({ type: 'SET_DATETIME', payload: { date: dateStr, time: selectedTime } })}>
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

function BackButton({ onClick }) {
  return (
    <button onClick={onClick} className="flex items-center gap-1.5 text-ink-3 hover:text-gold text-sm mb-6 transition-colors duration-150 cursor-pointer">
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
      </svg>
      Volver
    </button>
  );
}
function ChevLeft()  { return <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>; }
function ChevRight() { return <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>; }
function CalendarIcon() {
  return <svg className="w-8 h-8 text-ink-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" /></svg>;
}
