import { useRef } from 'react';
import { motion } from 'framer-motion';
import { Quote, Star, ChevronLeft, ChevronRight } from 'lucide-react';

export default function LandingTestimonials({ items = [], title, subtitle }) {
  const displayTestimonials = items.length > 0 ? items : [
    { text: "La atención al detalle es simplemente otro nivel. Mi experiencia superó todas las expectativas que tenía.", author: "Juan Pérez", role: "Cliente desde 2023", rating: 5 },
    { text: "El sistema de reserva es increíblemente fluido. Encontrar un espacio con mi barbero favorito nunca fue tan fácil.", author: "Miguel Torres", role: "Empresario", rating: 5 },
    { text: "Ambiente impecable y resultados consistentes. Es el único lugar donde confío plenamente mi imagen.", author: "Daniel R.", role: "Diseñador", rating: 5 },
  ];

  const scrollRef = useRef(null);
  const scrollBy = (dir) => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollBy({ left: dir * 300, behavior: 'smooth' });
  };

  return (
    <section id="testimoniales" className="py-20 md:py-24 bg-[#0F0F0F] text-stone-50 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-96 h-96 bg-gold/15 blur-[150px] rounded-full -mr-48 -mt-48 pointer-events-none" />
      
      <div className="section-container relative">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 md:mb-16 gap-4">
          <div className="text-center md:text-left flex-1">
            <div className="flex items-center justify-center md:justify-start gap-2 text-gold font-bold text-xs uppercase tracking-widest mb-3">
              <Quote size={14} />
              {title || 'Testimoniales'}
            </div>
            <h2 className="text-3xl md:text-5xl font-bold tracking-tightest leading-tight">
              {subtitle ? subtitle : (<>Lo que dicen <br className="hidden md:block" /><span className="opacity-40">nuestros clientes.</span></>)}
            </h2>
          </div>
          {/* Mobile arrows */}
          {displayTestimonials.length > 1 && (
            <div className="flex md:hidden items-center gap-2 justify-center">
              <button onClick={() => scrollBy(-1)} className="w-9 h-9 rounded-full border border-white/10 flex items-center justify-center text-white/50 active:bg-white/10 transition-all">
                <ChevronLeft size={16} />
              </button>
              <button onClick={() => scrollBy(1)} className="w-9 h-9 rounded-full border border-white/10 flex items-center justify-center text-white/50 active:bg-white/10 transition-all">
                <ChevronRight size={16} />
              </button>
            </div>
          )}
        </div>

        {/* Desktop grid */}
        <div className="hidden md:grid grid-cols-3 gap-6">
          {displayTestimonials.slice(0, 6).map((t, i) => (
            <TestimonialCard key={t.author + i} t={t} i={i} />
          ))}
        </div>

        {/* Mobile slider */}
        <div ref={scrollRef} className="md:hidden flex gap-4 overflow-x-auto snap-x snap-mandatory scrollbar-hide pb-4 -mx-6 px-6">
          {displayTestimonials.map((t, i) => (
            <div key={t.author + i} className="snap-start shrink-0 w-[85vw] max-w-[340px]">
              <TestimonialCard t={t} i={i} />
            </div>
          ))}
        </div>
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
      className="relative p-8 rounded-[2rem] bg-white/[0.04] border border-white/[0.06] flex flex-col justify-between h-full"
    >
      <div>
        <div className="flex gap-0.5 mb-5">
          {[...Array(t.rating || 5)].map((_, idx) => (
            <Star key={idx} size={13} fill="#D6AC48" className="text-gold" />
          ))}
        </div>
        <p className="text-[15px] leading-relaxed opacity-75 mb-6">
          "{t.text}"
        </p>
      </div>
      <div className="flex items-center gap-3 pt-4 border-t border-white/[0.06]">
        <div className="w-9 h-9 rounded-full bg-white/[0.06] flex items-center justify-center font-bold text-gold text-sm">
          {t.author?.[0] || '?'}
        </div>
        <div>
          <div className="font-bold text-sm">{t.author}</div>
          <div className="text-[10px] opacity-40 uppercase tracking-widest font-semibold">{t.role}</div>
        </div>
      </div>
    </motion.div>
  );
}
