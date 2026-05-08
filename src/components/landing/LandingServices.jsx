import { useState, useRef, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import * as LucideIcons from 'lucide-react';
import { Sparkles, ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';

const VISIBLE_DESKTOP = 6;

export default function LandingServices({ services = [], customServices, useCustom, title, subtitle, buttonText, linkText }) {
  const allServices = (useCustom && customServices?.length > 0)
    ? customServices
    : services.length > 0 ? services : [
        { name: 'Corte Premium', duration: 45, price: 450, description: 'Servicio de corte completo con lavado y estilizado.' },
        { name: 'Barba de Lujo', duration: 30, price: 300, description: 'Perfilado de barba con toalla caliente y aceites esenciales.' },
        { name: 'Experiencia Total', duration: 90, price: 700, description: 'Nuestro servicio más completo para renovar tu imagen.' },
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
    <section id="servicios" className="py-20 md:py-24 bg-surface/30">
      <div className="section-container">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 md:mb-16 gap-4 md:gap-6">
          <div className="max-w-xl">
            <div className="flex items-center gap-2 text-gold font-bold text-xs uppercase tracking-widest mb-3">
              <Sparkles size={14} />
              {title || 'Nuestros Servicios'}
            </div>
            <h2 className="text-3xl md:text-5xl font-bold text-ink tracking-tightest leading-tight">
              {subtitle ? subtitle : (<>Diseñados para superar <br className="hidden md:block" /><span className="text-ink-3">tus expectativas.</span></>)}
            </h2>
          </div>
          <div className="flex items-center gap-3">
            {/* Desktop pagination */}
            {needsPagination && (
              <div className="hidden md:flex items-center gap-2">
                <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}
                  className="w-10 h-10 rounded-full border border-edge flex items-center justify-center hover:bg-ink hover:text-surface transition-all disabled:opacity-20 disabled:cursor-not-allowed">
                  <ChevronLeft size={18} />
                </button>
                <span className="text-xs font-bold text-ink-3 min-w-[3ch] text-center">{page + 1}/{totalPages}</span>
                <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}
                  className="w-10 h-10 rounded-full border border-edge flex items-center justify-center hover:bg-ink hover:text-surface transition-all disabled:opacity-20 disabled:cursor-not-allowed">
                  <ChevronRight size={18} />
                </button>
              </div>
            )}
            <Link to="/agendar" className="text-ink font-bold flex items-center gap-2 group text-sm">
              <span className="hidden sm:inline">{linkText || 'Ver todos'}</span>
              <div className="w-8 h-8 rounded-full border border-edge flex items-center justify-center group-hover:bg-ink group-hover:text-surface transition-all">
                <ArrowRight size={16} />
              </div>
            </Link>
          </div>
        </div>

        {/* Desktop grid */}
        <div className="hidden md:grid grid-cols-2 lg:grid-cols-3 gap-6">
          {displayServices.map((service, i) => (
            <ServiceCard key={(service.name || '') + i + page} service={service} i={i} buttonText={buttonText} />
          ))}
        </div>

        {/* Mobile horizontal slider — centered */}
        <div ref={scrollRef} className="md:hidden flex gap-4 overflow-x-auto snap-x snap-mandatory scrollbar-hide pb-4"
          style={{ scrollPaddingInline: 'calc(50vw - 40vw)' }}>
          {allServices.map((service, i) => (
            <div key={(service.name || '') + i} className="snap-center shrink-0 w-[80vw] max-w-[320px] first:ml-[10vw] last:mr-[10vw]">
              <ServiceCard service={service} i={i} buttonText={buttonText} />
            </div>
          ))}
        </div>

        {/* Mobile controls — below slider */}
        {allServices.length > 1 && (
          <div className="flex md:hidden flex-col items-center gap-3 mt-4">
            {/* Dot indicators */}
            <div className="flex items-center gap-1.5">
              {allServices.map((_, i) => (
                <button key={i} onClick={() => scrollToSlide(i)}
                  className={`rounded-full transition-all duration-300 ${activeSlide === i ? 'w-6 h-2 bg-gold' : 'w-2 h-2 bg-ink/15'}`} />
              ))}
            </div>
            {/* Arrow buttons */}
            <div className="flex items-center gap-3">
              <button onClick={() => scrollToSlide(Math.max(0, activeSlide - 1))} disabled={activeSlide === 0}
                className="w-10 h-10 rounded-full border border-edge flex items-center justify-center text-ink/60 active:bg-ink active:text-surface transition-all disabled:opacity-20">
                <ChevronLeft size={18} />
              </button>
              <span className="text-xs font-bold text-ink-3 tabular-nums min-w-[3ch] text-center">{activeSlide + 1}/{allServices.length}</span>
              <button onClick={() => scrollToSlide(Math.min(allServices.length - 1, activeSlide + 1))} disabled={activeSlide >= allServices.length - 1}
                className="w-10 h-10 rounded-full border border-edge flex items-center justify-center text-ink/60 active:bg-ink active:text-surface transition-all disabled:opacity-20">
                <ChevronRight size={18} />
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

function ServiceCard({ service, i, buttonText }) {
  const IconComp = service.icon ? (LucideIcons[service.icon] || Sparkles) : Sparkles;
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: i * 0.05, duration: 0.3 }}
      className="group bg-card p-7 rounded-[1.75rem] hover:shadow-2xl hover:shadow-black/5 hover:-translate-y-1 transition-all duration-500 h-full flex flex-col"
      style={{ boxShadow: '0 1px 3px rgb(0 0 0 / 0.04), 0 4px 20px rgb(0 0 0 / 0.03)' }}
    >
      <div className="flex justify-between items-start mb-5">
        <div className="w-11 h-11 rounded-2xl bg-ink/5 flex items-center justify-center text-ink group-hover:bg-gold group-hover:text-on-gold transition-colors duration-500 overflow-hidden">
          {service.image_url ? (
            <img src={service.image_url} alt={service.name} className="w-full h-full object-cover" />
          ) : (
            <IconComp size={18} />
          )}
        </div>
        <div className="text-right">
          <div className="text-xl font-bold text-ink">${service.price}</div>
          <div className="text-[10px] font-semibold text-ink-3 uppercase tracking-wider">{service.duration || service.duration_mins} min</div>
        </div>
      </div>
      
      <h3 className="text-lg font-bold text-ink mb-2 tracking-tighter2">{service.name}</h3>
      <p className="text-ink-2 text-sm leading-relaxed mb-6 line-clamp-3 flex-1">
        {service.description || 'Experimenta el máximo nivel de detalle y cuidado en cada sesión.'}
      </p>

      <Link to="/agendar" className="mt-auto">
        <button className="w-full py-3.5 rounded-xl border border-edge/70 group-hover:border-ink group-hover:bg-ink group-hover:text-surface font-bold text-sm transition-all duration-300">
          {service.button_text || buttonText || 'Reservar'}
        </button>
      </Link>
    </motion.div>
  );
}
