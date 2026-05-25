import { useState, useRef, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import * as LucideIcons from 'lucide-react';
import { Sparkles, ArrowUpRight, ChevronLeft, ChevronRight, Clock } from 'lucide-react';
import { Link } from 'react-router-dom';
import { formatServicePrice } from '../../utils/formatters';

const VISIBLE_DESKTOP = 6;

export default function LandingServices({ services = [], customServices, useCustom, title, subtitle, subtitleAccent, buttonText, linkText }) {
  const allServices = (useCustom && customServices?.length > 0)
    ? customServices
    : services.length > 0 ? services : [
        { name: 'Corte Premium',      duration: 45, price: 450, description: 'Servicio de corte completo con lavado y estilizado.' },
        { name: 'Barba de Lujo',      duration: 30, price: 300, description: 'Perfilado de barba con toalla caliente y aceites esenciales.' },
        { name: 'Experiencia Total',  duration: 90, price: 700, description: 'Nuestro servicio más completo para renovar tu imagen.' },
      ];

  const needsPagination = allServices.length > VISIBLE_DESKTOP;
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
    <section id="servicios" className="relative py-24 lg:py-32 overflow-hidden">
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
            <div className="flex items-center gap-2">
              {needsPagination && (
                <div className="hidden md:flex items-center gap-2 mr-2">
                  <IconNav onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}>
                    <ChevronLeft size={16} />
                  </IconNav>
                  <span className="text-[11px] font-mono text-ink-3 min-w-[3ch] text-center tabular-nums">
                    {page + 1}/{totalPages}
                  </span>
                  <IconNav onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}>
                    <ChevronRight size={16} />
                  </IconNav>
                </div>
              )}
              <Link to="/agendar" className="text-[13px] font-semibold text-ink inline-flex items-center gap-2 group">
                <span className="hidden sm:inline">{linkText || 'Ver todos'}</span>
                <span className="w-9 h-9 rounded-full border border-edge group-hover:bg-ink group-hover:border-ink group-hover:text-card flex items-center justify-center transition-colors">
                  <ArrowUpRight size={14} strokeWidth={2.4} />
                </span>
              </Link>
            </div>
          }
        />

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
      </div>
    </section>
  );
}

function ServiceCard({ service, i, buttonText }) {
  const IconComp  = service.icon ? (LucideIcons[service.icon] || Sparkles) : Sparkles;
  const duration  = service.duration || service.duration_mins;
  const priceType = service.priceType || service.price_type || 'fixed';
  const showPrice = priceType !== 'ask' && service.price != null;
  // Accepts both camelCase (API/serviceCache) and snake_case (custom editor items)
  const imageUrl  = service.imageUrl || service.image_url || null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ delay: Math.min(i * 0.05, 0.3), duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
      className="group relative flex flex-col h-full"
    >
      <Link to="/agendar" className="block">
        {/* Image with floating price chip */}
        <div className="relative aspect-[4/5] sm:aspect-[5/6] w-full rounded-[28px] overflow-hidden bg-raised">
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={service.name}
              loading="lazy"
              className="absolute inset-0 w-full h-full object-cover transition-transform duration-[800ms] ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-[1.04]"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-raised via-card to-raised text-gold/30 group-hover:text-gold/60 transition-colors duration-700">
              <IconComp size={56} strokeWidth={1.2} />
            </div>
          )}

          {/* Bottom dark fade for overlay legibility */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/0 to-transparent" />

          {/* Floating price chip */}
          {showPrice && (
            <div className="absolute top-4 right-4 inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-card/85 backdrop-blur-md border border-edge/50 shadow-[0_8px_24px_rgba(0,0,0,0.18)]">
              <span className="text-[14px] font-bold text-ink tabular-nums">
                {formatServicePrice(service)}
              </span>
            </div>
          )}

          {/* Title overlaid at bottom for image-rich cards */}
          {imageUrl && (
            <div className="absolute inset-x-0 bottom-0 p-5 lg:p-6">
              <h3 className="text-white text-xl lg:text-2xl font-semibold tracking-tight drop-shadow-md">
                {service.name}
              </h3>
              {duration && (
                <span className="mt-1 inline-flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-[0.14em] text-white/85">
                  <Clock size={11} />
                  {duration} min
                </span>
              )}
            </div>
          )}
        </div>
      </Link>

      {/* Below-image content. Title + duration only render when there is no
          image (image-rich cards already show those over the image). The
          description is always shown so admins can use the Studio Editor's
          description field to add context on every card style. */}
      {(!imageUrl || service.description) && (
        <div className="mt-5 px-1 flex-1 flex flex-col">
          {!imageUrl && (
            <>
              <h3 className="text-xl font-semibold text-ink tracking-tight">{service.name}</h3>
              {duration && (
                <span className="mt-1.5 inline-flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-[0.14em] text-ink-3">
                  <Clock size={11} />
                  {duration} min
                </span>
              )}
            </>
          )}
          {service.description && (
            <p className={`text-sm text-ink-2 leading-relaxed line-clamp-2 ${!imageUrl ? 'mt-3' : ''}`}>
              {service.description}
            </p>
          )}
        </div>
      )}

      {/* CTA — minimal line that fills on hover */}
      <Link to="/agendar" className="mt-5 group/cta">
        <span className="inline-flex items-center gap-2 text-[13px] font-semibold text-ink">
          {service.button_text || buttonText || 'Reservar'}
          <span className="relative inline-block w-8 h-px bg-edge overflow-hidden">
            <span className="absolute inset-0 bg-gold scale-x-0 origin-left group-hover/cta:scale-x-100 transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]" />
          </span>
          <ArrowUpRight size={13} strokeWidth={2.4} className="text-ink-3 group-hover/cta:text-gold transition-colors" />
        </span>
      </Link>
    </motion.div>
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
        <div className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.22em] text-gold">
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
