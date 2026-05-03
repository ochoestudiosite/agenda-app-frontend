import { useState } from 'react';
import { formatDate, formatTime, formatPrice, generateSlots, groupSlots } from '../../utils/formatters';
import { useAvailability } from '../../hooks/useAvailability';
import { useConfig } from '../../hooks/useConfig';
import { useRescheduleAppointment, useCancelAppointment } from '../../hooks/useAppointment';
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
  const timeFmt = config?.time_format ?? '12h';
  const [mode,      setMode]      = useState('view');
  const [newDate,   setNewDate]   = useState(null);
  const [newTime,   setNewTime]   = useState(null);
  const [viewMonth, setViewMonth] = useState(() => {
    const t = new Date();
    return new Date(t.getFullYear(), t.getMonth(), 1);
  });

  const dateStr = newDate ? toDateStr(newDate) : null;
  const { data: availData, isFetching } = useAvailability(mode === 'reschedule' ? dateStr : null);
  const busySlots = availData?.busySlots || [];

  const rescheduleMutation = useRescheduleAppointment();
  const cancelMutation     = useCancelAppointment();
  const isCancelled        = appointment.status === 'cancelled';

  async function handleReschedule() {
    if (!newDate || !newTime) return;
    try {
      const updated = await rescheduleMutation.mutateAsync({
        code: appointment.code,
        date: toDateStr(newDate),
        time: newTime,
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
          <p className="text-ink-3 text-sm">{appointment.clientName} · {appointment.clientPhone}</p>
        </div>
      </div>

      {/* Details */}
      <div className="space-y-2.5 mb-6">
        <DetailRow label="Servicio" value={`${appointment.serviceName} (${appointment.serviceDuration} min)`} />
        <DetailRow label="Precio"   value={formatPrice(appointment.servicePrice)} gold />
        <DetailRow label="Barbero"  value={appointment.specialistName} />
        <DetailRow label="Fecha"    value={formatDate(appointment.date)} />
        <DetailRow label="Hora"     value={formatTime(appointment.time, timeFmt)} />
      </div>

      {/* Actions */}
      {!isCancelled && mode === 'view' && (
        <div className="flex gap-3 flex-wrap">
          <Button variant="outline" onClick={() => setMode('reschedule')}>Reagendar</Button>
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
          viewMonth={viewMonth}      setViewMonth={setViewMonth}
          newDate={newDate}          setNewDate={d => { setNewDate(d); setNewTime(null); }}
          newTime={newTime}          setNewTime={setNewTime}
          busySlots={busySlots}      isFetching={isFetching}
          onConfirm={handleReschedule}
          onCancel={() => setMode('view')}
          isLoading={rescheduleMutation.isPending}
        />
      )}
    </div>
  );
}

function ReschedulePanel({ appointment, viewMonth, setViewMonth, newDate, setNewDate, newTime, setNewTime, busySlots, isFetching, onConfirm, onCancel, isLoading }) {
  const { data: config } = useConfig();

  const maxAdvance   = config?.max_advance_days   ?? 30;
  const intervalMins = config?.slot_interval_mins ?? 30;
  const bizHours     = config?.hours ?? [];
  const daysClosed   = bizHours.length > 0
    ? bizHours.filter(h => !h.is_open).map(h => h.day_of_week)
    : [0];

  function getDayEntry(date) {
    if (!date || !bizHours.length) return null;
    return bizHours.find(h => h.day_of_week === date.getDay()) ?? null;
  }

  const today   = new Date(); today.setHours(0, 0, 0, 0);
  const maxDate = new Date(today); maxDate.setDate(maxDate.getDate() + maxAdvance);
  const isDisabled = d => d < today || d > maxDate || daysClosed.includes(d.getDay());

  const firstDay    = viewMonth.getDay();
  const daysInMonth = new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(viewMonth.getFullYear(), viewMonth.getMonth(), d));

  const dayEntry  = getDayEntry(newDate);
  const openTime  = dayEntry?.open_time  ?? '9:00';
  const closeTime = dayEntry?.close_time ?? '19:00';
  const allSlots  = newDate ? generateSlots(openTime, closeTime, appointment.serviceDuration, intervalMins) : [];
  const grouped   = groupSlots(allSlots);

  return (
    <div className="mt-5 border-t border-edge pt-5 space-y-4 animate-fade-in">
      <p className="text-sm font-medium text-ink">Selecciona nueva fecha y hora</p>

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
        ) : (
          <div className="space-y-3">
            {Object.entries({ morning: 'Mañana', afternoon: 'Tarde', evening: 'Noche' }).map(([key, label]) => {
              const slots = grouped[key];
              if (!slots?.length) return null;
              return (
                <div key={key}>
                  <p className="label-section mb-2">{label}</p>
                  <div className="grid grid-cols-4 gap-1.5">
                    {slots.map(slot => {
                      const busy = busySlots.includes(slot);
                      const sel  = newTime === slot;
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
        <Button variant="ghost" onClick={onCancel}>Cancelar</Button>
      </div>
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
