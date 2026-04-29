import { useServices } from '../../hooks/useServices';
import { useBooking } from '../../context/BookingContext';
import { formatPrice } from '../../utils/formatters';
import Spinner from '../ui/Spinner';

export default function ServiceSelector() {
  const { data, isLoading, isError } = useServices();
  const { dispatch } = useBooking();

  if (isLoading) return (
    <div className="space-y-3 animate-pulse">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="h-20 rounded-2xl skeleton" />
      ))}
    </div>
  );

  if (isError) return (
    <div className="text-center py-12">
      <p className="text-ink-3 text-sm">No se pudieron cargar los servicios.</p>
    </div>
  );

  return (
    <div className="animate-fade-up">
      <PageTitle title="Elige tu servicio" subtitle="¿Qué te gustaría hoy?" />
      <div className="space-y-2.5">
        {data.services.map((service, i) => (
          <ServiceCard
            key={service.id}
            service={service}
            delay={i * 40}
            onSelect={() => dispatch({ type: 'SET_SERVICE', payload: service })}
          />
        ))}
      </div>
    </div>
  );
}

function ServiceCard({ service, onSelect, delay }) {
  return (
    <button
      onClick={onSelect}
      className="w-full text-left group flex items-center gap-4 p-5 rounded-2xl border border-edge bg-card
                 hover:border-gold/40 hover:shadow-card active:scale-[0.99]
                 transition-all duration-240 cursor-pointer animate-fade-up"
      style={{ animationDelay: `${delay}ms`, animationFillMode: 'both' }}
    >
      {/* Duration pill */}
      <div className="shrink-0 flex flex-col items-center justify-center w-14 h-14 rounded-xl bg-raised group-hover:bg-gold/8 transition-colors duration-240">
        <span className="font-display text-base font-semibold text-ink leading-none">{service.duration}</span>
        <span className="text-[0.625rem] text-ink-3 font-medium mt-0.5">min</span>
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-[0.9375rem] text-ink group-hover:text-gold transition-colors duration-160 truncate">
          {service.name}
        </p>
        <p className="text-xs text-ink-3 mt-0.5 leading-snug line-clamp-1">{service.description}</p>
      </div>

      {/* Price + chevron */}
      <div className="shrink-0 flex items-center gap-3">
        <span className="font-semibold text-[0.9375rem] text-gold tabular-nums">{formatPrice(service.price)}</span>
        <ChevronRight />
      </div>
    </button>
  );
}

function PageTitle({ title, subtitle }) {
  return (
    <div className="mb-7">
      <h2 className="font-display text-2xl font-semibold text-ink tracking-tight">{title}</h2>
      {subtitle && <p className="text-ink-3 text-sm mt-1">{subtitle}</p>}
    </div>
  );
}

function ChevronRight() {
  return (
    <svg className="w-4 h-4 text-ink-3 group-hover:text-gold transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
    </svg>
  );
}
