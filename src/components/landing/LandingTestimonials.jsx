import { useRef, useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Quote, Star, ChevronLeft, ChevronRight } from 'lucide-react';

export default function LandingTestimonials({ items = [], title, subtitle }) {
  const displayTestimonials = items.length > 0 ? items : [
    { text: 'La atención al detalle es simplemente otro nivel. Mi experiencia superó todas las expectativas que tenía.', author: 'Juan Pérez',    role: 'Cliente desde 2023', rating: 5 },
    { text: 'El sistema de reserva es increíblemente fluido. Encontrar un espacio con mi barbero favorito nunca fue tan fácil.', author: 'Miguel Torres', role: 'Empresario',          rating: 5 },
    { text: 'Ambiente impecable y resultados consistentes. Es el único lugar donde confío plenamente mi imagen.',         author: 'Daniel R.',     role: 'Diseñador',           rating: 5 },
  ];

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
    <section
      id="testimoniales"
      className="relative py-24 lg:py-32 overflow-hidden bg-section-contrast text-section-contrast-text"
    >
      {/* Subtle radial glow */}
      <div aria-hidden className="absolute -top-40 right-0 w-[700px] h-[700px] rounded-full opacity-25 pointer-events-none"
           style={{ background: 'radial-gradient(circle at center, rgb(var(--gold) / 0.6) 0%, transparent 60%)' }} />
      {/* Giant decorative quote mark */}
      <div aria-hidden className="absolute top-12 left-6 lg:left-10 text-section-contrast-text/[0.04] pointer-events-none select-none">
        <Quote size={220} strokeWidth={1} fill="currentColor" />
      </div>

      <div className="section-container relative">
        <div className="max-w-2xl">
          <div className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.22em] text-gold">
            <span className="w-6 h-px bg-gold" />
            {title || 'Testimoniales'}
          </div>
          <h2 className="mt-3 font-display text-3xl sm:text-4xl lg:text-[44px] font-semibold tracking-[-0.025em] leading-[1.04] text-balance">
            {subtitle || <>Lo que dicen <span className="text-section-contrast-muted">nuestros clientes.</span></>}
          </h2>
        </div>

        {/* Desktop: editorial grid with featured wide first card */}
        <div className="hidden md:grid grid-cols-12 gap-5 lg:gap-6 mt-14 lg:mt-16">
          {displayTestimonials.slice(0, 6).map((t, i) => (
            <TestimonialCard
              key={(t.author || '') + i}
              t={t}
              i={i}
              span={i === 0 ? 7 : 5}
              featured={i === 0}
            />
          ))}
        </div>

        {/* Mobile slider */}
        <div ref={scrollRef} className="md:hidden flex gap-4 overflow-x-auto snap-x snap-mandatory scrollbar-hide pb-4 mt-10">
          {displayTestimonials.map((t, i) => (
            <div key={(t.author || '') + i} className="snap-center shrink-0 w-[84vw] max-w-[360px] first:ml-[8vw] last:mr-[8vw]">
              <TestimonialCard t={t} i={i} mobile />
            </div>
          ))}
        </div>

        {displayTestimonials.length > 1 && (
          <div className="flex md:hidden flex-col items-center gap-3 mt-6">
            <div className="flex items-center gap-1.5">
              {displayTestimonials.map((_, i) => (
                <button key={i} onClick={() => scrollToSlide(i)} aria-label={`Testimonio ${i + 1}`}
                  className={`rounded-full transition-all duration-300 ${activeSlide === i ? 'w-6 h-1.5 bg-gold' : 'w-1.5 h-1.5 bg-section-contrast-muted/30'}`} />
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

function TestimonialCard({ t, i, span = 4, featured = false, mobile = false }) {
  const colSpan = mobile ? '' : `lg:col-span-${span} col-span-12`;
  return (
    <motion.figure
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ delay: Math.min(i * 0.06, 0.25), duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
      className={`relative ${colSpan} flex flex-col h-full p-7 lg:p-9 rounded-[28px] border border-section-contrast-text/10 bg-section-contrast-text/[0.04] backdrop-blur-sm hover:bg-section-contrast-text/[0.06] transition-colors`}
    >
      {/* Stars */}
      <div className="flex gap-0.5 mb-5">
        {[...Array(t.rating || 5)].map((_, idx) => (
          <Star key={idx} size={13} fill="currentColor" className="text-gold" />
        ))}
      </div>

      <blockquote className={`flex-1 ${featured ? 'text-xl lg:text-2xl' : 'text-base lg:text-[17px]'} leading-relaxed text-section-contrast-text/90 font-medium text-balance`}>
        <span className="text-gold mr-1">&ldquo;</span>
        {t.text}
        <span className="text-gold ml-0.5">&rdquo;</span>
      </blockquote>

      <figcaption className="mt-6 pt-5 border-t border-section-contrast-text/10 flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-gold/15 text-gold flex items-center justify-center font-bold text-sm">
          {(t.author?.[0] || '?').toUpperCase()}
        </div>
        <div className="min-w-0">
          <div className="font-semibold text-sm text-section-contrast-text truncate">{t.author}</div>
          {t.role && (
            <div className="text-[10px] uppercase tracking-[0.16em] font-semibold text-section-contrast-muted truncate">
              {t.role}
            </div>
          )}
        </div>
      </figcaption>
    </motion.figure>
  );
}
