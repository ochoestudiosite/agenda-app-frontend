import { useQueryClient } from '@tanstack/react-query';
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
        <CalendarOffIcon className="w-7 h-7 text-ink-3" />
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
              icon={<PhoneIcon />}
              label="Teléfono"
              href={`tel:${phone.replace(/\s/g, '')}`}
              value={phone}
            />
          )}

          {email && (
            <ContactRow
              icon={<EmailIcon />}
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
            <SpinnerIcon className="w-4 h-4 animate-spin" />
            Verificando…
          </>
        ) : (
          <>
            <RefreshIcon className="w-4 h-4" />
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

function CalendarOffIcon({ className = '' }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
      <line x1="10" y1="14" x2="14" y2="18" />
      <line x1="14" y1="14" x2="10" y2="18" />
    </svg>
  );
}

function PhoneIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="w-4 h-4">
      <path strokeLinecap="round" strokeLinejoin="round" d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.09 12a19.79 19.79 0 01-3-8.61 2 2 0 012-2.18h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z" />
    </svg>
  );
}

function EmailIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="w-4 h-4">
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
      <polyline points="22,6 12,13 2,6" />
    </svg>
  );
}

function RefreshIcon({ className = '' }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <polyline points="23 4 23 10 17 10" />
      <polyline points="1 20 1 14 7 14" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" />
    </svg>
  );
}

function SpinnerIcon({ className = '' }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}
