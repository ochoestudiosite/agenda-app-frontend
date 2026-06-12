import { useServices } from '../../hooks/useServices';
import { useBooking } from '../../context/BookingContext';
import { formatServicePrice, formatCombinedPrice, formatPrice, promoSavings, promoEndsLabel, toTitleCase } from '../../utils/formatters';
import { BackButton } from './SpecialistSelector';

export default function ServiceSelector() {
  const { data, isLoading, isError } = useServices();
  const { state, dispatch } = useBooking();
  const selected = state.services ?? [];
  const atMax = selected.length >= 5;
  const totalDuration = selected.reduce((sum, s) => sum + (s.duration || 0), 0);

  if (isLoading) return (
    <div className="space-y-2.5">
      <div className="mb-7 space-y-2">
        <div className="h-7 w-48 skeleton rounded-xl" />
        <div className="h-4 w-32 skeleton rounded-lg" />
      </div>
      {[...Array(4)].map((_, i) => (
        <div key={i} className="flex items-center gap-4 p-5 rounded-2xl border border-edge bg-card">
          <div className="shrink-0 w-14 h-14 rounded-full skeleton" />
          <div className="flex-1 space-y-2">
            <div className="h-4 skeleton rounded-lg" style={{ width: `${55 + (i % 3) * 15}%` }} />
            <div className="h-3 skeleton rounded-md" style={{ width: `${35 + (i % 2) * 20}%` }} />
          </div>
          <div className="shrink-0 h-4 w-14 skeleton rounded-lg" />
        </div>
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
      {state.branch && <BackButton onClick={() => dispatch({ type: 'GO_BACK' })} />}
      <div className="mb-7">
        <h2 className="font-display text-2xl font-semibold text-ink tracking-tight">Elige tus servicios</h2>
        <p className="text-ink-3 text-sm mt-1">
          Puedes seleccionar hasta 5 servicios
          {atMax && <span className="text-gold font-medium"> · máximo alcanzado</span>}
        </p>
      </div>

      {/* Extra bottom padding so the sticky bar doesn't overlap last card */}
      <div className={`space-y-2.5 ${selected.length > 0 ? 'pb-28' : ''}`}>
        {data.services.map((service, i) => {
          const isSelected = selected.some(s => s.id === service.id);
          const isDisabled = atMax && !isSelected;
          return (
            <ServiceCard
              key={service.id}
              service={service}
              isSelected={isSelected}
              isDisabled={isDisabled}
              delay={i * 40}
              onToggle={() => dispatch({ type: 'TOGGLE_SERVICE', payload: service })}
            />
          );
        })}
      </div>

      {/* Running total + continue — sticky to bottom of scroll container */}
      {selected.length > 0 && (
        <div className="sticky bottom-0 -mx-1 px-1 pt-3 pb-1 animate-fade-up">
          <div className="bg-card border border-edge dark:border-white/[0.08] rounded-2xl shadow-card dark:shadow-[0_4px_20px_rgba(0,0,0,0.5)] p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-gold bg-gold/10 px-2.5 py-0.5 rounded-full">
                  {selected.length} {selected.length === 1 ? 'servicio' : 'servicios'}
                </span>
                <span className="text-xs text-ink-3 tabular-nums">{totalDuration} min</span>
              </div>
              <div className="text-right">
                <span className="font-semibold text-ink tabular-nums">
                  {formatCombinedPrice(selected)}
                </span>
                {promoSavings(selected) > 0 && (
                  <p className="text-[11px] font-semibold text-gold tabular-nums">
                    Ahorras {formatPrice(promoSavings(selected))}
                  </p>
                )}
              </div>
            </div>
            <button
              onClick={() => dispatch({ type: 'CONFIRM_SERVICES' })}
              className="w-full py-3 rounded-xl bg-gold text-on-gold font-semibold text-sm tracking-wide
                         hover:bg-gold/90 active:scale-[0.98] transition-all duration-160 cursor-pointer"
            >
              Continuar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function ServiceCard({ service, isSelected, isDisabled, onToggle, delay }) {
  const hasImage = Boolean(service.imageUrl);

  return (
    <button
      onClick={onToggle}
      className={`w-full text-left group flex items-center gap-4 p-4 rounded-2xl border
                  transition-all duration-240 cursor-pointer animate-fade-up
                  ${isSelected
                    ? 'border-gold bg-gold/5 shadow-card'
                    : isDisabled
                      ? 'border-edge dark:border-white/[0.05] bg-card opacity-40 cursor-not-allowed'
                      : 'border-edge dark:border-white/[0.08] bg-card hover:border-gold/50 dark:hover:border-gold/70 hover:shadow-card active:scale-[0.99]'
                  }`}
      style={{ animationDelay: `${delay}ms`, animationFillMode: 'both' }}
    >
      {/* Circular avatar — image when available, duration fallback otherwise */}
      <div className={`relative shrink-0 w-14 h-14 rounded-full overflow-hidden flex flex-col items-center justify-center
                       border-2 transition-all duration-240
                       ${isSelected
                         ? 'border-gold/60 bg-gold/10'
                         : 'border-gold/20 bg-gold/8 group-hover:border-gold/55 group-hover:bg-gold/15'}`}>
        <span className="font-display text-sm font-bold text-gold leading-none">{service.duration}</span>
        <span className="text-[0.5625rem] text-ink-3 font-medium mt-0.5">min</span>
        {hasImage && (
          <img
            src={service.imageUrl}
            alt={service.name}
            className="absolute inset-0 w-full h-full object-cover"
            style={{ opacity: 0, transition: 'opacity 200ms ease' }}
            onLoad={e  => { e.currentTarget.style.opacity = '1'; }}
            onError={e => { e.currentTarget.style.display = 'none'; }}
          />
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 min-w-0">
          <p className={`font-semibold text-[0.9375rem] transition-colors duration-160 truncate
                         ${isSelected ? 'text-gold' : 'text-ink group-hover:text-gold'}`}>
            {toTitleCase(service.name)}
          </p>
          {service.promo && (
            <>
              <span className="shrink-0 inline-flex items-center px-1.5 py-0.5 rounded-full text-[0.625rem] font-bold uppercase tracking-wide bg-gold text-on-gold">
                {service.promo.discountType === 'percent'
                  ? `−${Number(service.promo.discountValue)}%`
                  : 'Promo'}
              </span>
              {promoEndsLabel(service.promo.endsAt) && (
                <span className="shrink-0 text-[0.625rem] font-semibold text-gold/80">
                  {promoEndsLabel(service.promo.endsAt)}
                </span>
              )}
            </>
          )}
        </div>
        {service.description && (
          <p className="text-xs text-ink-3 mt-0.5 leading-snug line-clamp-2">{service.description}</p>
        )}
        {hasImage && (
          <span className="inline-flex items-center gap-1 mt-1.5 text-[0.6875rem] font-medium text-ink-3 bg-raised px-2 py-0.5 rounded-full">
            {service.duration} min
          </span>
        )}
      </div>

      {/* Price + checkbox */}
      <div className="shrink-0 flex items-center gap-3">
        {service.promo ? (
          <div className="flex flex-col items-end leading-tight">
            <span className="text-xs text-ink-3 line-through tabular-nums">{formatServicePrice(service)}</span>
            <span className="font-semibold text-[0.9375rem] text-gold tabular-nums">
              {formatServicePrice({ ...service, price: service.promo.finalPrice })}
            </span>
          </div>
        ) : (
          <span className="font-semibold text-[0.9375rem] text-gold tabular-nums">{formatServicePrice(service)}</span>
        )}
        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all duration-160 shrink-0
                         ${isSelected ? 'border-gold bg-gold' : 'border-ink-3/50 group-hover:border-gold'}`}>
          {isSelected && (
            <svg className="w-3 h-3 text-on-gold" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          )}
        </div>
      </div>
    </button>
  );
}
