import { formatDate, formatTime, formatPrice, toTitleCase } from '../../utils/formatters';
import { useConfig } from '../../hooks/useConfig';

export default function GroupAppointmentCard({ group }) {
  const { data: config } = useConfig();
  const timeFmt = config?.time_format ?? '12h';

  const allCancelled = group.appointments?.every(a => a.status === 'cancelled');
  const status = allCancelled ? 'cancelled' : group.status;

  return (
    <div className="card p-6 max-w-xl mx-auto animate-fade-up">
      {/* Header */}
      <div className="flex items-start justify-between mb-5">
        <div>
          <div className="flex items-center gap-2.5 mb-1.5">
            <span className="font-display text-xl font-bold text-gold tracking-wider">{group.groupCode}</span>
            <StatusBadge status={status} />
          </div>
          <p className="text-ink-3 text-sm">{group.clientName} · {group.clientPhone}</p>
        </div>
        <div className="text-right shrink-0">
          <p className="text-xs text-ink-3">Total</p>
          <p className="text-base font-semibold text-gold tabular-nums">{formatPrice(group.totalPrice)}</p>
        </div>
      </div>

      {/* Date row */}
      <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-raised border border-edge mb-5">
        <svg className="w-4 h-4 text-gold shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
          <rect x="3" y="4" width="18" height="18" rx="2"/>
          <line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/>
          <line x1="3" y1="10" x2="21" y2="10"/>
        </svg>
        <span className="text-sm font-medium text-ink">{formatDate(group.date)}</span>
        <span className="text-ink-3 text-xs ml-auto">{group.totalDuration} min en total</span>
      </div>

      {/* Appointments list */}
      <div className="space-y-3 mb-5">
        {(group.appointments ?? []).map((appt, i) => (
          <div key={appt.code} className="flex items-start gap-3 p-3.5 rounded-xl border border-edge bg-raised/50">
            <div className="w-7 h-7 rounded-lg bg-gold/10 border border-gold/20 flex items-center justify-center shrink-0 text-[11px] font-bold text-gold">
              {i + 1}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-ink leading-snug">
                {toTitleCase(appt.serviceName)}
              </p>
              <p className="text-xs text-ink-3 mt-0.5">
                con {toTitleCase(appt.specialistName)}
              </p>
              <div className="flex items-center gap-3 mt-1.5">
                <span className="text-[11px] text-ink-2 font-medium">{formatTime(appt.time, timeFmt)}</span>
                <span className="text-[11px] text-ink-3">{appt.serviceDuration} min</span>
                <span className="text-[11px] text-gold font-medium tabular-nums">{formatPrice(appt.servicePrice)}</span>
                {appt.status === 'cancelled' && (
                  <span className="badge badge-cancelled text-[10px]">Cancelada</span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Info note */}
      {status !== 'cancelled' && (
        <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-gold/5 border border-gold/20">
          <svg className="w-4 h-4 text-gold mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          <p className="text-xs text-ink-3 leading-relaxed">
            Para reagendar o cancelar tu visita grupal, comunícate directamente con el negocio.
          </p>
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }) {
  const cls    = { confirmed: 'badge badge-confirmed', cancelled: 'badge badge-cancelled', rescheduled: 'badge badge-rescheduled' };
  const labels = { confirmed: 'Confirmada', cancelled: 'Cancelada', rescheduled: 'Reagendada' };
  return <span className={cls[status] || 'badge'}>{labels[status] || status}</span>;
}
