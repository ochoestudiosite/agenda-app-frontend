import { useState, useRef, useEffect, useCallback } from 'react';
import { ArrowUpRight, ChevronLeft, ChevronRight, Clock } from 'lucide-react';
import { Link } from 'react-router-dom';
import { formatServicePrice, promoEndsLabel } from '../../utils/formatters';
import { useConfig } from '../../hooks/useConfig';
import { promoConceptLabel } from '../ui/PromoPrice';

const VISIBLE_DESKTOP = 6;

export default function LandingServices({ services = [], title, subtitle, subtitleAccent, buttonText, linkText }) {
  const allServices = services.length > 0 ? services : [
        { name: 'Corte Premium',      duration: 45, price: 450, description: 'Servicio de corte completo con lavado y estilizado.' },
        { name: 'Barba de Lujo',      duration: 30, price: 300, description: 'Perfilado de barba con toalla caliente y aceites esenciales.' },
        { name: 'Experiencia Total',  duration: 90, price: 700, description: 'Nuestro servicio más completo para renovar tu imagen.' },
      ];

  const isSolo = allServices.length === 1;
  const needsPagination = !isSolo && allServices.length > VISIBLE_DESKTOP;
  const [page, setPage] = useState(0);
  const totalPages = Math.ceil(allServices.length / VISIBLE_DESKTOP);
  const displayServices = needsPagination
    ? allServices.slice(page * VISIBLE_DESKTOP, (page + 1) * VISIBLE_DESKTOP)
    : allServices;

  const scrollRef = useRef(null);
  const [activeSlide, setActiveSlide] = useState(0);

  const scrollToSlide = useCallback((idx) => {
    const c = scrollRef.current;
    if (!c) return;
    const cards = c.children;
    if (cards[idx]) {
      const card = cards[idx];
      const scrollLeft = card.offsetLeft - (c.offsetWidth / 2) + (card.offsetWidth / 2);
      c.scrollTo({ left: scrollLeft, behavior: 'smooth' });
    }
  }, []);

  const handleScroll = useCallback(() => {
    const c = scrollRef.current;
    if (!c) return;
    const center = c.scrollLeft + c.offsetWidth / 2;
    let closest = 0, closestDist = Infinity;
    Array.from(c.children).forEach((child, i) => {
      const childCenter = child.offsetLeft + child.offsetWidth / 2;
      const dist = Math.abs(center - childCenter);
      if (dist < closestDist) { closestDist = dist; closest = i; }
    });
    setActiveSlide(closest);
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.addEventListener('scroll', handleScroll, { passive: true });
    return () => el.removeEventListener('scroll', handleScroll);
  }, [handleScroll]);

  return (
    <section id="servicios" className="relative py-24 lg:py-32 overflow-hidden bg-card">
      {/* Subtle section accent */}
      <div aria-hidden className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-edge to-transparent" />

      <div className="section-container">
        {/* Section header — editorial two-line eyebrow / display */}
        <SectionHeader
          eyebrow={title || 'Nuestros servicios'}
          title={subtitle}
          accent={subtitleAccent}
          fallback={<>Diseñados para superar<br /><span className="text-ink-3">tus expectativas.</span></>}
          right={
            <div className="flex items-center gap-4">
              <Link to="/agendar" className="hidden sm:inline-flex items-center gap-1.5 text-[13px] font-semibold text-ink-2 hover:text-ink transition-colors group shrink-0">
                {linkText || 'Ver todos los servicios'}
                <ArrowUpRight size={13} strokeWidth={2.4} className="text-ink-3 group-hover:text-ink transition-colors" />
              </Link>
              {needsPagination && (
                <div className="hidden md:flex items-center gap-2">
                  <IconNav onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}>
                    <ChevronLeft size={16} />
                  </IconNav>
                  <span className="text-[12px] font-mono text-ink-3 min-w-[3ch] text-center tabular-nums">
                    {page + 1}/{totalPages}
                  </span>
                  <IconNav onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}>
                    <ChevronRight size={16} />
                  </IconNav>
                </div>
              )}
            </div>
          }
        />

        {isSolo ? (
          <ServiceSpotlight service={allServices[0]} buttonText={buttonText} />
        ) : (
          <>
            {/* Desktop grid */}
            <div className="hidden md:grid grid-cols-2 lg:grid-cols-3 gap-5 lg:gap-6 mt-14 lg:mt-16">
              {displayServices.map((service, i) => (
                <ServiceCard key={page * VISIBLE_DESKTOP + i} service={service} i={i} buttonText={buttonText} />
              ))}
            </div>

            {/* Mobile slider */}
            <div ref={scrollRef} className="md:hidden flex gap-4 overflow-x-auto snap-x snap-mandatory scrollbar-hide pb-4 mt-10">
              {allServices.map((service, i) => (
                <div key={(service.name || '') + i} className="snap-center shrink-0 w-[82vw] max-w-[340px] first:ml-[9vw] last:mr-[9vw]">
                  <ServiceCard service={service} i={i} buttonText={buttonText} />
                </div>
              ))}
            </div>

            {/* Mobile controls */}
            {allServices.length > 1 && (
              <div className="flex md:hidden flex-col items-center gap-3 mt-6">
                <div className="flex items-center gap-1.5">
                  {allServices.map((_, i) => (
                    <button key={i} onClick={() => scrollToSlide(i)} aria-label={`Servicio ${i + 1}`}
                      className={`rounded-full transition-all duration-300 ${activeSlide === i ? 'w-6 h-1.5 bg-gold' : 'w-1.5 h-1.5 bg-ink/15'}`} />
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
}

function ServiceCard({ service, i, buttonText }) {
  const { data: config } = useConfig();
  const bizTz     = config?.business_timezone ?? null;
  const duration  = service.duration || service.duration_mins;
  const priceType = service.priceType || service.price_type || 'fixed';
  const showPrice = priceType !== 'ask' && service.price != null;
  const imageUrl  = service.imageUrl || service.image_url || null;
  const flagged   = Boolean(service.requirements || service.prerequisite);

  return (
    <div
      className="group animate-fade-up"
      style={{ animationDelay: `${Math.min(i * 50, 300)}ms`, animationFillMode: 'both' }}
    >
      <Link to="/agendar" className="block rounded-[28px] landing-card-shape overflow-hidden">
        <div className="relative aspect-[4/5] sm:aspect-[5/6] w-full bg-raised">

          {/* Placeholder — siempre visible mientras carga o si no hay imagen */}
          <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-raised via-card to-raised">
            <span className="font-display text-7xl font-bold text-gold/20 select-none tracking-tight">
              {service.name.split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase()}
            </span>
          </div>

          {/* Imagen encima — fade-in al cargar */}
          {imageUrl && (
            <img
              src={imageUrl}
              alt={service.name}
              loading="lazy"
              className="absolute inset-0 w-full h-full object-cover group-hover:scale-[1.04]"
              style={{ opacity: 0, transition: 'opacity 200ms ease, transform 800ms cubic-bezier(0.16,1,0.3,1)' }}
              onLoad={e  => { e.currentTarget.style.opacity = '1'; }}
              onError={e => { e.currentTarget.style.display = 'none'; }}
            />
          )}

          {/* Gradiente oscuro — cubre el 55% inferior para legibilidad */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 via-[42%] to-transparent" />

          {/* Price badge — con promo: precio tachado + promocional + chip de descuento */}
          {showPrice && (
            <div className="absolute top-4 right-4 flex flex-col items-end gap-1.5">
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full
                              bg-card/85 backdrop-blur-md border border-edge/50
                              shadow-[0_8px_24px_rgba(0,0,0,0.18)]">
                {service.promo ? (
                  <>
                    <span className="text-[12px] text-ink-3 line-through tabular-nums">
                      {formatServicePrice(service)}
                    </span>
                    <span className="text-[13px] font-bold text-ink tabular-nums">
                      {formatServicePrice({ ...service, price: service.promo.finalPrice })}
                    </span>
                  </>
                ) : (
                  <span className="text-[13px] font-bold text-ink tabular-nums">
                    {formatServicePrice(service)}
                  </span>
                )}
              </div>
              {service.promo && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wide
                                 bg-gold text-on-gold shadow-[0_4px_16px_rgba(0,0,0,0.25)]">
                  {promoConceptLabel({ discountType: service.promo.discountType, discountValue: service.promo.discountValue })} Promo
                </span>
              )}
              {service.promo && promoEndsLabel(service.promo.endsAt, bizTz) && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide
                                 bg-card/85 backdrop-blur-md border border-edge/50 text-ink
                                 shadow-[0_4px_16px_rgba(0,0,0,0.18)]">
                  {promoEndsLabel(service.promo.endsAt, bizTz)}
                </span>
              )}
            </div>
          )}

          {/* Todo el contenido dentro de la card */}
          <div className="absolute inset-x-0 bottom-0 p-5 lg:p-6">

            {/* Descripción — sutil, 2 líneas */}
            {service.description && (
              <p className="text-[0.8rem] text-white/55 leading-snug line-clamp-2 mb-2.5">
                {service.description}
              </p>
            )}

            {/* Nombre del servicio */}
            <h3 className="text-white text-xl lg:text-2xl font-semibold tracking-tight leading-snug drop-shadow-md">
              {service.name}
            </h3>

            {/* Duración + requisitos previos (informativo, sin acción aquí) */}
            {(duration || flagged) && (
              <div className="mt-1.5 flex items-center gap-2 flex-wrap">
                {duration && (
                  <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.16em] text-white/65">
                    <Clock size={10} strokeWidth={2} />
                    {duration} min
                  </span>
                )}
                {flagged && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide bg-amber-500 text-white">
                    Requisitos previos
                  </span>
                )}
              </div>
            )}

            {/* CTA — siempre dentro de la card */}
            <div className="mt-4 pt-3.5 border-t border-white/[0.12] flex items-center justify-between">
              <span className="text-[12px] font-semibold text-white/75 group-hover:text-white transition-colors duration-200">
                {service.button_text || buttonText || 'Reservar'}
              </span>
              <div className="w-7 h-7 rounded-full bg-white/[0.10] border border-white/20
                             flex items-center justify-center
                             group-hover:bg-gold group-hover:border-gold
                             transition-all duration-300">
                <ArrowUpRight size={13} strokeWidth={2.4} className="text-white" />
              </div>
            </div>
          </div>
        </div>
      </Link>
    </div>
  );
}

// Cuando solo hay un servicio, el grid/slider deja la mayor parte de la
// sección vacía. En su lugar mostramos un layout "spotlight": foto grande a
// un lado, info editorial (nombre, descripción, precio) al otro.
function ServiceSpotlight({ service, buttonText }) {
  const { data: config } = useConfig();
  const bizTz     = config?.business_timezone ?? null;
  const duration  = service.duration || service.duration_mins;
  const priceType = service.priceType || service.price_type || 'fixed';
  const showPrice = priceType !== 'ask' && service.price != null;
  const imageUrl  = service.imageUrl || service.image_url || null;
  const flagged   = Boolean(service.requirements || service.prerequisite);

  return (
    <div className="mt-14 lg:mt-16 grid md:grid-cols-[minmax(0,420px)_1fr] lg:grid-cols-[460px_1fr] gap-8 lg:gap-16 items-center animate-fade-up">
      {/* Photo */}
      <Link to="/agendar" className="group block relative aspect-[4/5] w-full max-w-sm mx-auto md:max-w-none rounded-[32px] landing-card-shape overflow-hidden bg-raised">
        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-raised via-card to-raised">
          <span className="font-display text-8xl font-bold text-gold/20 select-none tracking-tight">
            {service.name.split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase()}
          </span>
        </div>

        {imageUrl && (
          <img
            src={imageUrl}
            alt={service.name}
            loading="lazy"
            className="absolute inset-0 w-full h-full object-cover group-hover:scale-[1.03]"
            style={{ opacity: 0, transition: 'opacity 200ms ease, transform 800ms cubic-bezier(0.16,1,0.3,1)' }}
            onLoad={e  => { e.currentTarget.style.opacity = '1'; }}
            onError={e => { e.currentTarget.style.display = 'none'; }}
          />
        )}

        <div className="absolute top-4 right-4 w-9 h-9 rounded-full bg-card/85 backdrop-blur-md
                       flex items-center justify-center text-ink
                       opacity-0 -translate-y-1
                       group-hover:opacity-100 group-hover:translate-y-0
                       transition-all duration-300">
          <ArrowUpRight size={14} strokeWidth={2.4} />
        </div>
      </Link>

      {/* Info panel */}
      <div className="text-center md:text-left">
        {duration && (
          <div className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.22em] text-gold mb-4">
            <Clock size={12} strokeWidth={2.4} />
            {duration} min
          </div>
        )}

        <h3 className="font-display text-3xl sm:text-4xl lg:text-[44px] font-semibold text-ink tracking-[-0.025em] leading-[1.05] text-balance">
          {service.name}
        </h3>

        {service.description && (
          <p className="mt-4 text-[15px] leading-relaxed text-ink-2 max-w-md mx-auto md:mx-0">
            {service.description}
          </p>
        )}

        {showPrice && (
          <div className="mt-6 flex flex-wrap items-center justify-center md:justify-start gap-3">
            {service.promo ? (
              <>
                <span className="text-[15px] text-ink-3 line-through tabular-nums">
                  {formatServicePrice(service)}
                </span>
                <span className="font-display text-3xl font-bold text-ink tabular-nums">
                  {formatServicePrice({ ...service, price: service.promo.finalPrice })}
                </span>
                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wide bg-gold text-on-gold">
                  {promoConceptLabel({ discountType: service.promo.discountType, discountValue: service.promo.discountValue })} Promo
                </span>
                {promoEndsLabel(service.promo.endsAt, bizTz) && (
                  <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold uppercase tracking-wide bg-raised border border-edge text-ink-2">
                    {promoEndsLabel(service.promo.endsAt, bizTz)}
                  </span>
                )}
              </>
            ) : (
              <span className="font-display text-3xl font-bold text-ink tabular-nums">
                {formatServicePrice(service)}
              </span>
            )}
          </div>
        )}

        {flagged && (
          <div className="mt-4 flex justify-center md:justify-start">
            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wide bg-amber-500 text-white">
              Requisitos previos
            </span>
          </div>
        )}

        <Link
          to="/agendar"
          className="mt-8 inline-flex items-center gap-2 bg-gold text-on-gold px-6 h-12 rounded-full
                     text-[13px] font-bold hover:opacity-90 active:scale-[0.98] transition-all
                     shadow-[0_8px_24px_rgba(0,0,0,0.12)]"
        >
          {service.button_text || buttonText || 'Reservar'}
          <ArrowUpRight size={15} strokeWidth={2.4} />
        </Link>
      </div>
    </div>
  );
}

// ─── Shared bits ─────────────────────────────────────────────────────────────
// title  = main headline (renders in full ink colour)
// accent = optional secondary line rendered as a <span> below the title with
//          the softer ink-3 colour. Mirrors the original "Diseñados para
//          superar / tus expectativas." pattern so admins can recreate the
//          two-tone headline from the Landing Editor instead of being stuck
//          with a single flat line.
// fallback runs when the admin has not provided a custom title at all.
export function SectionHeader({ eyebrow, title, accent, fallback, right }) {
  return (
    <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
      <div className="max-w-xl">
        <div className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.22em] text-gold">
          <span className="w-6 h-px bg-gold" />
          {eyebrow}
        </div>
        <h2 className="mt-3 font-display text-3xl sm:text-4xl lg:text-[44px] font-semibold text-ink tracking-[-0.025em] leading-[1.04] text-balance">
          {(title || accent) ? (
            <>
              {title}
              {accent && <><br /><span className="text-ink-3">{accent}</span></>}
            </>
          ) : fallback}
        </h2>
      </div>
      {right}
    </div>
  );
}

function IconNav({ children, onClick, disabled }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="w-9 h-9 rounded-full border border-edge flex items-center justify-center text-ink-2 hover:bg-ink hover:border-ink hover:text-card disabled:opacity-25 disabled:cursor-not-allowed transition-colors"
    >
      {children}
    </button>
  );
}
