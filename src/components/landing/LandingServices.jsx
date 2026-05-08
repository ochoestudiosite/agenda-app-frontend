import { motion } from 'framer-motion';
import * as LucideIcons from 'lucide-react';
import { Sparkles, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function LandingServices({ services = [], customServices, useCustom, title, subtitle, buttonText, linkText }) {
  // If useCustom is true AND customServices exist, show those; otherwise show DB services
  const displayServices = (useCustom && customServices?.length > 0)
    ? customServices
    : services.length > 0 ? services : [
        { name: 'Corte Premium', duration: 45, price: 450, description: 'Servicio de corte completo con lavado y estilizado.' },
        { name: 'Barba de Lujo', duration: 30, price: 300, description: 'Perfilado de barba con toalla caliente y aceites esenciales.' },
        { name: 'Experiencia Total', duration: 90, price: 700, description: 'Nuestro servicio más completo para renovar tu imagen.' },
      ];

  return (
    <section id="servicios" className="py-24 bg-surface/30">
      <div className="section-container">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-16 gap-6">
          <div className="max-w-xl">
            <div className="flex items-center gap-2 text-gold font-bold text-xs uppercase tracking-widest mb-4">
              <Sparkles size={14} />
              {title || 'Nuestros Servicios'}
            </div>
            <h2 className="text-4xl md:text-5xl font-bold text-ink tracking-tightest leading-tight">
              {subtitle ? (
                subtitle
              ) : (
                <>Diseñados para superar <br /><span className="text-ink-3">tus expectativas.</span></>
              )}
            </h2>
          </div>
          <Link to="/agendar" className="text-ink font-bold flex items-center gap-2 group">
            {linkText || 'Ver todos los servicios'}
            <div className="w-8 h-8 rounded-full border border-edge flex items-center justify-center group-hover:bg-ink group-hover:text-surface transition-all">
              <ArrowRight size={16} />
            </div>
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {displayServices.map((service, i) => {
            const IconComp = service.icon ? (LucideIcons[service.icon] || Sparkles) : Sparkles;
            return (
              <motion.div
                key={(service.name || '') + i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="group glass p-8 rounded-[2rem] hover:bg-card transition-all duration-500 hover:shadow-2xl hover:shadow-black/5 hover:-translate-y-1"
              >
                <div className="flex justify-between items-start mb-6">
                  <div className="w-12 h-12 rounded-2xl bg-ink/5 flex items-center justify-center text-ink group-hover:bg-gold group-hover:text-on-gold transition-colors duration-500 overflow-hidden">
                    {service.image_url ? (
                      <img src={service.image_url} alt={service.name} className="w-full h-full object-cover" />
                    ) : (
                      <IconComp size={20} />
                    )}
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-ink">${service.price}</div>
                    <div className="text-xs font-medium text-ink-3 uppercase tracking-wider">{service.duration || service.duration_mins} min</div>
                  </div>
                </div>
                
                <h3 className="text-xl font-bold text-ink mb-3 tracking-tighter2">
                  {service.name}
                </h3>
                <p className="text-ink-2 text-sm leading-relaxed mb-8">
                  {service.description || 'Experimenta el máximo nivel de detalle y cuidado en cada sesión con nosotros.'}
                </p>

                <Link to="/agendar">
                  <button className="w-full py-4 rounded-2xl border border-edge group-hover:border-ink group-hover:bg-ink group-hover:text-surface font-bold text-sm transition-all duration-300">
                    {service.button_text || buttonText || 'Reservar este servicio'}
                  </button>
                </Link>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
