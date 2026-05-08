import { motion } from 'framer-motion';
import * as LucideIcons from 'lucide-react';
import { ArrowRight, Star, ShieldCheck, Clock, HelpCircle } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function LandingHero({ title, subtitle, cta, secondaryCta, features = [], showFeatures = true }) {
  const displayFeatures = features.length === 3 ? features : ['Pago Seguro', 'Ahorra Tiempo', 'Top Calidad'];

  return (
    <section className="relative pt-32 pb-20 overflow-hidden">
      {/* Background blur decorative elements */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-6xl h-[500px] pointer-events-none opacity-20 dark:opacity-10">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-gold blur-[120px] rounded-full animate-pulse" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-gold blur-[120px] rounded-full animate-pulse" style={{ animationDelay: '2s' }} />
      </div>

      <div className="section-container relative">
        <div className="flex flex-col items-center text-center">
          {/* Badge */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gold/10 border border-gold/20 text-gold text-xs font-bold uppercase tracking-widest mb-8"
          >
            <Star size={12} fill="currentColor" />
            Experiencia Premium
          </motion.div>

          {/* Main Title */}
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-5xl md:text-7xl lg:text-8xl font-bold text-ink tracking-tightest leading-[0.95] mb-8 text-balance"
          >
            {title ? (
              title
            ) : (
              <>Tu tiempo es lo más <br /><span className="text-transparent bg-clip-text bg-gradient-to-r from-gold via-gold-light to-gold">valioso que tienes.</span></>
            )}
          </motion.h1>

          {/* Description */}
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="max-w-2xl text-lg md:text-xl text-ink-2 leading-relaxed mb-12 text-balance"
          >
            {subtitle || 'Reserva servicios de alta calidad con los mejores profesionales. Sin llamadas, sin esperas, solo la mejor atención personalizada para ti.'}
          </motion.p>

          {/* Actions */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto"
          >
            <Link to="/agendar" className="w-full sm:w-auto">
              <button className="w-full sm:w-auto btn-premium flex items-center justify-center gap-2 px-8 py-4 text-lg">
                {cta || 'Reservar Cita'}
                <ArrowRight size={20} />
              </button>
            </Link>
            <Link to="/gestionar" className="w-full sm:w-auto">
              <button className="w-full sm:w-auto px-8 py-4 text-lg font-semibold text-ink-2 hover:text-ink transition-colors">
                {secondaryCta || 'Ver mi reserva'}
              </button>
            </Link>
          </motion.div>

          {/* Trust indicators */}
          {showFeatures && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 1, delay: 0.5 }}
              className="mt-20 grid grid-cols-2 md:grid-cols-3 gap-8 md:gap-16 border-t border-edge/30 pt-10"
            >
              {displayFeatures.map((feat, idx) => {
                const defaults = [
                  { icon: 'ShieldCheck', text: 'Pago Seguro' },
                  { icon: 'Clock', text: 'Ahorra Tiempo' },
                  { icon: 'Star', text: 'Top Calidad' }
                ];
                const isObj = typeof feat === 'object';
                const iconName = isObj ? feat.icon : defaults[idx].icon;
                const text = isObj ? feat.text : (feat || defaults[idx].text);
                const IconComp = LucideIcons[iconName] || HelpCircle;

                return (
                  <div key={idx} className={`flex flex-col items-center gap-2 ${idx === 2 ? 'hidden md:flex' : ''}`}>
                    <IconComp className="text-gold" size={24} />
                    <span className="text-xs font-bold text-ink-3 uppercase tracking-wider">{text}</span>
                  </div>
                );
              })}
            </motion.div>
          )}
        </div>
      </div>
    </section>
  );
}
