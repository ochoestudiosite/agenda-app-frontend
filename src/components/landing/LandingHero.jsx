import { motion } from 'framer-motion';
import * as LucideIcons from 'lucide-react';
import { ArrowUpRight, ShieldCheck, Clock, Star, HelpCircle, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';

// Premium hero. The default arrangement is editorial-asymmetric:
//   - Display-weight headline left-aligned on desktop, centred on mobile
//   - Slim eyebrow → headline → subtitle → CTA row → trust strip
//   - Background uses subtle radial gradient + a faint grid pattern so
//     the canvas reads as crafted rather than empty.
// All props are kept compatible with the existing landing editor.
export default function LandingHero({ title, subtitle, cta, secondaryCta, features, showFeatures = true }) {
  const defaults = [
    { icon: 'ShieldCheck', text: 'Pago Seguro' },
    { icon: 'Clock',       text: 'Ahorra Tiempo' },
    { icon: 'Star',        text: 'Top Calidad' },
  ];
  const displayFeatures = (features?.length === 3) ? features : defaults;

  const headlineFallback = (
    <>
      Tu tiempo es lo más <span className="italic font-medium text-ink-2">valioso</span>{' '}
      que tienes.
    </>
  );

  return (
    <section className="relative pt-32 sm:pt-36 lg:pt-40 pb-20 lg:pb-28 overflow-hidden">
      {/* Background: faint radial glow + grid */}
      <BackgroundDecoration />

      <div className="section-container relative">
        <div className="max-w-5xl mx-auto text-center">
          {/* Eyebrow */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-edge/60 bg-card/60 backdrop-blur text-[10px] sm:text-[11px] font-bold uppercase tracking-[0.18em] text-ink-2 mb-8"
          >
            <span className="relative flex w-1.5 h-1.5">
              <span className="absolute inset-0 rounded-full bg-gold animate-ping opacity-60" />
              <span className="relative w-1.5 h-1.5 rounded-full bg-gold" />
            </span>
            Reservas abiertas hoy
          </motion.div>

          {/* Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.65, delay: 0.05, ease: [0.16, 1, 0.3, 1] }}
            className="font-display text-[44px] sm:text-6xl lg:text-[88px] font-semibold text-ink leading-[1.02] tracking-[-0.03em] text-balance"
          >
            {title || headlineFallback}
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.15 }}
            className="mt-7 max-w-2xl mx-auto text-base sm:text-lg lg:text-[19px] text-ink-2 leading-relaxed text-balance"
          >
            {subtitle || 'Reserva servicios de alta calidad con los mejores profesionales. Sin llamadas, sin esperas — sólo la mejor atención personalizada.'}
          </motion.p>

          {/* CTAs */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.25 }}
            className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-3"
          >
            <Link to="/agendar" className="w-full sm:w-auto">
              <button className="group w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-ink text-card pl-7 pr-5 h-14 rounded-full text-[15px] font-semibold hover:bg-gold hover:text-on-gold transition-colors duration-300">
                {cta || 'Reservar cita'}
                <span className="w-7 h-7 rounded-full bg-card/15 group-hover:bg-on-gold/15 flex items-center justify-center transition-colors">
                  <ArrowUpRight size={14} strokeWidth={2.4} />
                </span>
              </button>
            </Link>
            <Link to="/gestionar" className="w-full sm:w-auto">
              <button className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 h-14 px-5 text-[14px] font-semibold text-ink-2 hover:text-ink transition-colors group">
                {secondaryCta || 'Ver mi reserva'}
                <ArrowUpRight size={14} strokeWidth={2.4} className="text-ink-3 group-hover:text-ink transition-colors" />
              </button>
            </Link>
          </motion.div>

          {/* Trust strip */}
          {showFeatures && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.45 }}
              className="mt-16 sm:mt-20 pt-8 border-t border-edge/40 flex flex-wrap items-center justify-center gap-x-8 sm:gap-x-12 gap-y-4"
            >
              {displayFeatures.map((feat, idx) => {
                const isObj = typeof feat === 'object';
                const iconName = isObj ? feat.icon : defaults[idx]?.icon;
                const text     = isObj ? feat.text : (feat || defaults[idx]?.text);
                const Icon     = LucideIcons[iconName] || HelpCircle;
                return (
                  <div key={idx} className="flex items-center gap-2.5">
                    <span className="w-7 h-7 rounded-full bg-gold/10 text-gold flex items-center justify-center">
                      <Icon size={13} strokeWidth={2.2} />
                    </span>
                    <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-ink-2">
                      {text}
                    </span>
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

function BackgroundDecoration() {
  return (
    <div aria-hidden className="absolute inset-0 pointer-events-none overflow-hidden">
      {/* Soft radial glow tied to brand */}
      <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[900px] h-[900px] rounded-full opacity-[0.18] dark:opacity-[0.12]"
           style={{ background: 'radial-gradient(circle at center, rgb(var(--gold) / 0.5) 0%, transparent 60%)' }} />
      {/* Faint dot grid for editorial texture */}
      <div className="absolute inset-0 opacity-[0.04] dark:opacity-[0.06]"
           style={{
             backgroundImage: 'radial-gradient(rgb(var(--ink)) 1px, transparent 1px)',
             backgroundSize: '28px 28px',
             maskImage: 'linear-gradient(to bottom, black 0%, black 50%, transparent 100%)',
             WebkitMaskImage: 'linear-gradient(to bottom, black 0%, black 50%, transparent 100%)',
           }} />
    </div>
  );
}
