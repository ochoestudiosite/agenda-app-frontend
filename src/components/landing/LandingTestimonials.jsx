import { motion } from 'framer-motion';
import { Quote, Star } from 'lucide-react';

export default function LandingTestimonials({ items = [], title, subtitle }) {
  const displayTestimonials = items.length > 0 ? items : [
    {
      text: "La atención al detalle es simplemente otro nivel. Mi experiencia superó todas las expectativas que tenía.",
      author: "Juan Pérez",
      role: "Cliente desde 2023",
      rating: 5
    },
    {
      text: "El sistema de reserva es increíblemente fluido. Encontrar un espacio con mi barbero favorito nunca fue tan fácil.",
      author: "Miguel Torres",
      role: "Empresario",
      rating: 5
    },
    {
      text: "Ambiente impecable y resultados consistentes. Es el único lugar donde confío plenamente mi imagen.",
      author: "Daniel R.",
      role: "Diseñador",
      rating: 5
    }
  ];

  return (
    <section id="testimoniales" className="py-24 bg-[#0F0F0F] text-stone-50 relative overflow-hidden">
      {/* Decorative background element */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-gold/20 blur-[120px] rounded-full -mr-48 -mt-48" />
      
      <div className="section-container relative">
        <div className="text-center mb-16">
          <div className="flex items-center justify-center gap-2 text-gold font-bold text-xs uppercase tracking-widest mb-4">
            <Quote size={14} />
            {title || 'Testimoniales'}
          </div>
          <h2 className="text-4xl md:text-5xl font-bold tracking-tightest leading-tight">
            {subtitle ? (
              subtitle
            ) : (
              <>Lo que dicen <br /><span className="opacity-40">nuestros clientes.</span></>
            )}
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {displayTestimonials.map((t, i) => (
            <motion.div
              key={t.author + i}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="relative p-10 rounded-[2.5rem] bg-white/5 border border-white/10 flex flex-col justify-between"
            >
              <div>
                <div className="flex gap-1 mb-6">
                  {[...Array(t.rating || 5)].map((_, idx) => (
                    <Star key={idx} size={14} fill="#D6AC48" className="text-gold" />
                  ))}
                </div>
                <p className="text-lg leading-relaxed opacity-80 mb-8 italic">
                  "{t.text}"
                </p>
              </div>
              
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center font-bold text-gold">
                  {t.author?.[0] || '?'}
                </div>
                <div>
                  <div className="font-bold text-sm">{t.author}</div>
                  <div className="text-xs opacity-50 uppercase tracking-widest font-semibold">{t.role}</div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
