import { useQueryClient } from '@tanstack/react-query';
import { useConfig } from '../../hooks/useConfig';

export default function BookingUnavailable() {
  const { data: config, isFetching, refetch } = useConfig();
  const qc = useQueryClient();

  const name  = config?.business_name  || 'Este negocio';
  const phone = config?.business_phone || null;
  const email = config?.business_email || null;
  const whatsapp = config?.whatsapp_enabled && phone ? phone : null;

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

          {whatsapp && (
            <ContactRow
              icon={<WhatsAppIcon />}
              label="WhatsApp"
              href={`https://wa.me/${whatsapp.replace(/\D/g, '')}`}
              value={phone}
              external
            />
          )}

          {phone && !whatsapp && (
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

function WhatsAppIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
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
