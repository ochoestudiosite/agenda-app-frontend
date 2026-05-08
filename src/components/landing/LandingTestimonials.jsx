import { useRef, useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Quote, Star, ChevronLeft, ChevronRight } from 'lucide-react';

export default function LandingTestimonials({ items = [], title, subtitle }) {
  const displayTestimonials = items.length > 0 ? items : [
    { text: "La atención al detalle es simplemente otro nivel. Mi experiencia superó todas las expectativas que tenía.", author: "Juan Pérez", role: "Cliente desde 2023", rating: 5 },
    { text: "El sistema de reserva es increíblemente fluido. Encontrar un espacio con mi barbero favorito nunca fue tan fácil.", author: "Miguel Torres", role: "Empresario", rating: 5 },
    { text: "Ambiente impecable y resultados consistentes. Es el único lugar donde confío plenamente mi imagen.", author: "Daniel R.", role: "Diseñador", rating: 5 },
  ];

  const scrollRef = useRef(null);
  const [activeSlide, setActiveSlide] = useState(0);

  const scrollToSlide = useCallback((idx) => {
    if (!scrollRef.current) return;
    const container = scrollRef.current;
    const cards = container.children;
    if (cards[idx]) {
      const card = cards[idx];
      const scrollLeft = card.offsetLeft - (container.offsetWidth / 2) + (card.offsetWidth / 2);
      container.scrollTo({ left: scrollLeft, behavior: 'smooth' });
    }
  }, []);

  const handleScroll = useCallback(() => {
    if (!scrollRef.current) return;
    const container = scrollRef.current;
    const center = container.scrollLeft + container.offsetWidth / 2;
    let closest = 0;
    let closestDist = Infinity;
    Array.from(container.children).forEach((child, i) => {
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
    <section id="testimoniales" className="py-20 md:py-24 bg-section-contrast relative overflow-hidden"
      style={{
        '--ink': 'var(--section-contrast-text)',
        '--ink-2': 'var(--section-contrast-muted)',
        '--ink-3': 'var(--section-contrast-muted)',
      }}
    >
      <div className="absolute top-0 right-0 w-96 h-96 bg-gold/15 blur-[150px] rounded-full -mr-48 -mt-48 pointer-events-none" />
      
      <div className="section-container relative">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 md:mb-16 gap-4">
          <div className="text-center md:text-left flex-1">
            <div className="flex items-center justify-center md:justify-start gap-2 text-gold font-bold text-xs uppercase tracking-widest mb-3">
              <Quote size={14} />
              {title || 'Testimoniales'}
            </div>
            <h2 className="text-3xl md:text-5xl font-bold tracking-tightest leading-tight">
              {subtitle ? subtitle : (<>Lo que dicen <br className="hidden md:block" /><span className="text-ink-3">nuestros clientes.</span></>)}
            </h2>
          </div>
        </div>

        {/* Desktop grid */}
        <div className="hidden md:grid grid-cols-3 gap-6">
          {displayTestimonials.slice(0, 6).map((t, i) => (
            <TestimonialCard key={t.author + i} t={t} i={i} />
          ))}
        </div>

        {/* Mobile slider — centered */}
        <div ref={scrollRef} className="md:hidden flex gap-4 overflow-x-auto snap-x snap-mandatory scrollbar-hide pb-4">
          {displayTestimonials.map((t, i) => (
            <div key={t.author + i} className="snap-center shrink-0 w-[85vw] max-w-[340px] first:ml-[7.5vw] last:mr-[7.5vw]">
              <TestimonialCard t={t} i={i} />
            </div>
          ))}
        </div>

        {/* Mobile controls — below slider */}
        {displayTestimonials.length > 1 && (
          <div className="flex md:hidden flex-col items-center gap-3 mt-4">
            <div className="flex items-center gap-1.5">
              {displayTestimonials.map((_, i) => (
                <button key={i} onClick={() => scrollToSlide(i)}
                  className={`rounded-full transition-all duration-300 ${activeSlide === i ? 'w-6 h-2 bg-gold' : 'w-2 h-2 bg-ink-3/30'}`} />
              ))}
            </div>
            <div className="flex items-center gap-3">
              <button onClick={() => scrollToSlide(Math.max(0, activeSlide - 1))} disabled={activeSlide === 0}
                className="w-10 h-10 rounded-full border border-ink-3/20 flex items-center justify-center text-ink-3 active:bg-gold active:text-on-gold transition-all disabled:opacity-20">
                <ChevronLeft size={18} />
              </button>
              <span className="text-xs font-bold text-ink-3 tabular-nums min-w-[3ch] text-center">{activeSlide + 1}/{displayTestimonials.length}</span>
              <button onClick={() => scrollToSlide(Math.min(displayTestimonials.length - 1, activeSlide + 1))} disabled={activeSlide >= displayTestimonials.length - 1}
                className="w-10 h-10 rounded-full border border-ink-3/20 flex items-center justify-center text-ink-3 active:bg-gold active:text-on-gold transition-all disabled:opacity-20">
                <ChevronRight size={18} />
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

function TestimonialCard({ t, i }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: i * 0.08, duration: 0.3 }}
      className="relative p-8 rounded-[2rem] bg-ink/[0.05] border border-ink-3/10 flex flex-col justify-between h-full"
    >
      <div>
        <div className="flex gap-0.5 mb-5">
          {[...Array(t.rating || 5)].map((_, idx) => (
            <Star key={idx} size={13} fill="currentColor" className="text-gold" />
          ))}
        </div>
        <p className="text-[15px] leading-relaxed text-ink-2 mb-6">
          "{t.text}"
        </p>
      </div>
      <div className="flex items-center gap-3 pt-4 border-t border-ink-3/10">
        <div className="w-9 h-9 rounded-full bg-ink/[0.06] flex items-center justify-center font-bold text-gold text-sm">
          {t.author?.[0] || '?'}
        </div>
        <div>
          <div className="font-bold text-sm text-ink">{t.author}</div>
          <div className="text-[10px] text-ink-3 uppercase tracking-widest font-semibold">{t.role}</div>
        </div>
      </div>
    </motion.div>
  );
}
