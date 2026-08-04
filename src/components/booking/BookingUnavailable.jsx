import { useQueryClient } from '@tanstack/react-query';
import { CalendarOff, Phone, Mail, RefreshCw, Loader2 } from 'lucide-react';
import { useConfig } from '../../hooks/useConfig';

export default function BookingUnavailable() {
  const { data: config, isFetching, refetch } = useConfig();
  const qc = useQueryClient();

  const name  = config?.business_name  || 'Este negocio';
  const phone = config?.business_phone || null;
  const email = config?.business_email || null;

  async function handleRetry() {
    await qc.invalidateQueries({ queryKey: ['config'] });
    refetch();
  }

  return (
    <div className="animate-fade-up max-w-md mx-auto text-center py-6">

      {/* Icon */}
      <div className="animate-scale-in w-16 h-16 rounded-full bg-ink-3/8 border border-edge flex items-center justify-center mx-auto mb-6">
        <CalendarOff className="w-7 h-7 text-ink-3" strokeWidth={1.75} />
      </div>

      <h2 className="font-display text-2xl font-semibold text-ink tracking-tight mb-2">
        Sin disponibilidad por el momento
      </h2>
      <p className="text-ink-3 text-sm leading-relaxed mb-8">
        {name} ha alcanzado su capacidad de citas para este mes.
        Las reservas se reactivarán el próximo mes.
      </p>

      {/* Contact section */}
      {(phone || email) && (
        <div className="card p-5 mb-6 text-left space-y-3">
          <p className="text-xs font-semibold text-ink-3 uppercase tracking-widest mb-1">
            Contacta al negocio
          </p>

          {phone && (
            <ContactRow
              icon={<Phone className="w-4 h-4" strokeWidth={1.75} />}
              label="Teléfono"
              href={`tel:${phone.replace(/\s/g, '')}`}
              value={phone}
            />
          )}

          {email && (
            <ContactRow
              icon={<Mail className="w-4 h-4" strokeWidth={1.75} />}
              label="Correo"
              href={`mailto:${email}`}
              value={email}
            />
          )}
        </div>
      )}

      {/* Retry */}
      <button
        onClick={handleRetry}
        disabled={isFetching}
        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium border border-edge bg-raised text-ink hover:bg-card hover:border-gold/40 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px]"
      >
        {isFetching ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Verificando…
          </>
        ) : (
          <>
            <RefreshCw className="w-4 h-4" />
            Verificar disponibilidad
          </>
        )}
      </button>
    </div>
  );
}

function ContactRow({ icon, label, href, value, external }) {
  return (
    <a
      href={href}
      {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
      className="flex items-center gap-3 group"
    >
      <span className="text-gold shrink-0">{icon}</span>
      <div className="min-w-0">
        <p className="text-ink-3 text-xs">{label}</p>
        <p className="text-ink text-sm font-medium group-hover:text-gold transition-colors truncate">{value}</p>
      </div>
    </a>
  );
}

