import { useState } from 'react';
import { formatDate, formatTime, formatPrice, generateSlots, groupSlots } from '../../utils/formatters';
import { useAvailability } from '../../hooks/useAvailability';
import { useRescheduleAppointment, useCancelAppointment } from '../../hooks/useAppointment';
import { useToast } from '../ui/Toast';
import Button from '../ui/Button';
import Spinner from '../ui/Spinner';

const MONTHS_ES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
const DAYS_ES   = ['Do','Lu','Ma','Mi','Ju','Vi','Sá'];
const DAYS_CLOSED = [0];
const MAX_ADVANCE = 30;

function toDateStr(d) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

export default function AppointmentCard({ appointment, onUpdated }) {
  const toast = useToast();
  const [mode, setMode]   = useState('view');
  const [newDate, setNewDate] = useState(null);
  const [newTime, setNewTime] = useState(null);
  const [viewMonth, setViewMonth] = useState(() => { const t = new Date(); return new Date(t.getFullYear(), t.getMonth(), 1); });

  const dateStr = newDate ? toDateStr(newDate) : null;
  const { data: availData, isFetching } = useAvailability(mode === 'reschedule' ? dateStr : null);
  const busySlots = availData?.busySlots || [];

  const rescheduleMutation = useRescheduleAppointment();
  const cancelMutation     = useCancelAppointment();
  const isCancelled = appointment.status === 'cancelled';

  async function handleReschedule() {
    if (!newDate || !newTime) return;
    try {
      const updated = await rescheduleMutation.mutateAsync({ code: appointment.code, date: toDateStr(newDate), time: newTime });
      toast('Cita reagendada correctamente.', 'success');
      setMode('view'); onUpdated(updated);
    } catch (err) { toast(err.message || 'Error al reagendar.', 'error'); }
  }

  async function handleCancel() {
    try {
      await cancelMutation.mutateAsync(appointment.code);
      toast('Cita cancelada.', 'info');
      onUpdated({ ...appointment, status: 'cancelled' }); setMode('view');
    } catch (err) { toast(err.message || 'Error al cancelar.', 'error'); }
  }

  return (
    <div className="card p-6 max-w-xl mx-auto animate-slide-up">
      {/* Header */}
      <div className="flex items-start justify-between mb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="font-display text-xl font-bold text-gold tracking-wider">{appointment.code}</span>
            <StatusBadge status={appointment.status} />
          </div>
          <p className="text-ink-2 text-sm">{appointment.clientName} · {appointment.clientPhone}</p>
        </div>
      </div>

      {/* Details */}
      <div className="space-y-2.5 mb-6">
        <DetailRow label="Servicio" value={`${appointment.serviceName} (${appointment.serviceDuration} min)`} />
        <DetailRow label="Precio"   value={formatPrice(appointment.servicePrice)} gold />
        <DetailRow label="Barbero"  value={appointment.specialistName} />
        <DetailRow label="Fecha"    value={formatDate(appointment.date)} />
        <DetailRow label="Hora"     value={formatTime(appointment.time)} />
      </div>

      {/* Actions */}
      {!isCancelled && mode === 'view' && (
        <div className="flex gap-3 flex-wrap">
          <Button variant="outline" onClick={() => setMode('reschedule')}>Reagendar</Button>
          <Button variant="danger"  onClick={() => setMode('cancel-confirm')}>Cancelar cita</Button>
        </div>
      )}

      {mode === 'cancel-confirm' && (
        <div className="mt-4 p-4 bg-red-500/8 border border-red-500/30 rounded-xl">
          <p className="text-red-500 text-sm mb-4">¿Seguro que deseas cancelar esta cita? Esta acción no se puede deshacer.</p>
          <div className="flex gap-3">
            <Button variant="danger" loading={cancelMutation.isPending} onClick={handleCancel}>Sí, cancelar</Button>
            <Button variant="ghost" onClick={() => setMode('view')}>Volver</Button>
          </div>
        </div>
      )}

      {mode === 'reschedule' && (
        <ReschedulePanel
          appointment={appointment}
          viewMonth={viewMonth} setViewMonth={setViewMonth}
          newDate={newDate} setNewDate={d => { setNewDate(d); setNewTime(null); }}
          newTime={newTime} setNewTime={setNewTime}
          busySlots={busySlots} isFetching={isFetching}
          onConfirm={handleReschedule} onCancel={() => setMode('view')}
          isLoading={rescheduleMutation.isPending}
        />
      )}
    </div>
  );
}

function ReschedulePanel({ appointment, viewMonth, setViewMonth, newDate, setNewDate, newTime, setNewTime, busySlots, isFetching, onConfirm, onCancel, isLoading }) {
  const today = new Date(); today.setHours(0,0,0,0);
  const maxDate = new Date(today); maxDate.setDate(maxDate.getDate() + MAX_ADVANCE);
  const isDisabled = d => d < today || d > maxDate || DAYS_CLOSED.includes(d.getDay());

  const firstDay = viewMonth.getDay();
  const daysInMonth = new Date(viewMonth.getFullYear(), viewMonth.getMonth()+1, 0).getDate();
  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(viewMonth.getFullYear(), viewMonth.getMonth(), d));

  const allSlots = generateSlots(9, 19, appointment.serviceDuration);
  const grouped  = groupSlots(allSlots);

  return (
    <div className="mt-5 border-t border-edge pt-5 space-y-5">
      <p className="text-sm font-medium text-ink">Selecciona nueva fecha y hora:</p>

      {/* Mini calendar */}
      <div className="card p-4">
        <div className="flex items-center justify-between mb-3">
          <button onClick={() => setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth()-1, 1))} className="p-1.5 text-ink-2 hover:text-ink cursor-pointer">‹</button>
          <span className="text-sm font-medium text-ink capitalize">{MONTHS_ES[viewMonth.getMonth()]} {viewMonth.getFullYear()}</span>
          <button onClick={() => setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth()+1, 1))} className="p-1.5 text-ink-2 hover:text-ink cursor-pointer">›</button>
        </div>
        <div className="grid grid-cols-7 mb-1">
          {DAYS_ES.map(d => <div key={d} className="text-center text-xs text-ink-3 py-0.5">{d}</div>)}
        </div>
        <div className="grid grid-cols-7 gap-y-0.5">
          {cells.map((date, i) => {
            if (!date) return <div key={`e-${i}`} />;
            const disabled = isDisabled(date);
            const isSel = newDate && toDateStr(date) === toDateStr(newDate);
            return (
              <button key={toDateStr(date)} disabled={disabled} onClick={() => setNewDate(date)}
                className={`h-8 text-xs rounded-lg transition-all
                  ${disabled ? 'text-ink-3 opacity-40 cursor-not-allowed' : 'cursor-pointer hover:bg-raised'}
                  ${isSel ? 'bg-gold text-on-gold font-bold' : !disabled ? 'text-ink' : ''}
                `}>
                {date.getDate()}
              </button>
            );
          })}
        </div>
      </div>

      {/* Time slots */}
      {newDate && (
        isFetching ? (
          <div className="flex justify-center py-4"><Spinner size="sm" /></div>
        ) : (
          <div className="space-y-3">
            {Object.entries({ morning: 'Mañana', afternoon: 'Tarde', evening: 'Noche' }).map(([key, label]) => {
              const slots = grouped[key];
              if (!slots.length) return null;
              return (
                <div key={key}>
                  <p className="text-xs text-ink-3 uppercase tracking-wider mb-1.5 font-medium">{label}</p>
                  <div className="grid grid-cols-4 gap-1.5">
                    {slots.map(slot => {
                      const busy = busySlots.includes(slot);
                      const sel  = newTime === slot;
                      return (
                        <button key={slot} disabled={busy} onClick={() => setNewTime(slot)}
                          className={`py-1.5 rounded-lg text-xs font-medium transition-all
                            ${busy ? 'text-ink-3 bg-raised line-through cursor-not-allowed opacity-50' : 'cursor-pointer'}
                            ${sel  ? 'bg-gold text-on-gold' : !busy ? 'bg-raised text-ink-2 hover:border hover:border-gold/40 hover:text-gold' : ''}
                          `}>
                          {slot}
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

      <div className="flex gap-3">
        <Button onClick={onConfirm} disabled={!newDate || !newTime} loading={isLoading}>Confirmar reagendo</Button>
        <Button variant="ghost" onClick={onCancel}>Cancelar</Button>
      </div>
    </div>
  );
}

function DetailRow({ label, value, gold }) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-ink-2 text-sm">{label}</span>
      <span className={`text-sm font-medium ${gold ? 'text-gold' : 'text-ink'}`}>{value}</span>
    </div>
  );
}

function StatusBadge({ status }) {
  const styles = {
    confirmed:   'bg-green-500/10  text-green-600  dark:text-green-400  border-green-500/40',
    cancelled:   'bg-red-500/10    text-red-600    dark:text-red-400    border-red-500/40',
    rescheduled: 'bg-blue-500/10   text-blue-600   dark:text-blue-400   border-blue-500/40',
  };
  const labels = { confirmed: 'Confirmada', cancelled: 'Cancelada', rescheduled: 'Reagendada' };
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full border ${styles[status] || ''}`}>
      {labels[status] || status}
    </span>
  );
}
