import {
  ArrowUpRight, HelpCircle,
  Calendar, Scissors, Coffee, Heart, Star, Smile, Crown, Anchor, Gem, Zap, Gift,
  ShieldCheck, Clock, Mail, MapPin, Phone, Sparkles, Briefcase,
} from 'lucide-react';
import { Link } from 'react-router-dom';

// Únicos íconos configurables desde admin-app/src/pages/LandingEditor.jsx (ICON_OPTIONS).
const ICON_MAP = {
  Calendar, Scissors, Coffee, Heart, Star, Smile, Crown, Anchor, Gem, Zap, Gift,
  ShieldCheck, Clock, Mail, MapPin, Phone, Sparkles, Briefcase,
};

export default function LandingHero({ title, titleAccent, subtitle, cta, secondaryCta, features, showFeatures = true, badge, showBadge = true }) {
  const defaults = [
    { icon: 'ShieldCheck', text: 'Pago Seguro' },
    { icon: 'Clock',       text: 'Ahorra Tiempo' },
    { icon: 'Star',        text: 'Top Calidad' },
  ];
  const displayFeatures = (features?.length === 3) ? features : defaults;

  const headlineFallback = (
    <>
      Tu tiempo es lo más valioso
      <br />
      <span className="text-ink-3">que tienes.</span>
    </>
  );

  return (
    <section id="inicio" className="relative min-h-[100dvh] flex flex-col overflow-hidden">
      <BackgroundDecoration />

      {/* Contenido principal — centrado en el espacio disponible */}
      <div className="flex-1 flex flex-col justify-center section-container relative w-full pt-20">
        <div className="max-w-5xl mx-auto text-center">

          {/* Eyebrow */}
          {showBadge && (
            <div
              className="animate-fade-up inline-flex items-center gap-2 px-3 py-1 rounded-full border border-edge/60 bg-card/60 backdrop-blur text-[11px] sm:text-[12px] font-bold uppercase tracking-[0.18em] text-ink-2 mb-8"
            >
              <span className="relative flex w-1.5 h-1.5">
                <span className="absolute inset-0 rounded-full bg-gold animate-ping opacity-60" />
                <span className="relative w-1.5 h-1.5 rounded-full bg-gold" />
              </span>
              {badge || 'Reserva en línea · Sin esperas'}
            </div>
          )}

          {/* Headline */}
          <h1
            className="animate-fade-up font-display font-semibold text-ink leading-[1.02] tracking-[-0.03em] text-balance"
            style={{ fontSize: 'clamp(2.25rem, 3.5vw + 1.5rem, 5.5rem)', animationDelay: '50ms', animationFillMode: 'both' }}
          >
            {(title || titleAccent) ? (
              <>
                {title}
                {titleAccent && <><br /><span className="text-ink-3">{titleAccent}</span></>}
              </>
            ) : headlineFallback}
          </h1>

          {/* Subtitle */}
          <p
            className="animate-fade-up mt-6 sm:mt-7 max-w-2xl mx-auto text-ink-2 leading-relaxed text-balance"
            style={{ fontSize: 'clamp(1rem, 0.75vw + 0.875rem, 1.1875rem)', animationDelay: '150ms', animationFillMode: 'both' }}
          >
            {subtitle || 'Reserva servicios de alta calidad con los mejores profesionales. Sin llamadas, sin esperas — sólo la mejor atención personalizada.'}
          </p>

          {/* CTAs */}
          <div
            className="animate-fade-up mt-10 flex flex-col sm:flex-row items-center justify-center gap-3"
            style={{ animationDelay: '250ms', animationFillMode: 'both' }}
          >
            <Link to="/agendar" className="w-full sm:w-auto">
              <button
                className="group w-full sm:w-auto inline-flex items-center justify-center gap-2 pl-7 pr-5 h-14 rounded-full text-[15px] font-bold transition-all hover:opacity-90 active:scale-[0.98]"
                style={{
                  background: 'linear-gradient(135deg, rgb(var(--gold-light)), rgb(var(--gold)))',
                  color: 'rgb(var(--on-gold))',
                  boxShadow: '0 4px 20px rgb(var(--gold) / 0.28)',
                }}
              >
                {cta || 'Reservar cita'}
                <span className="w-7 h-7 rounded-full flex items-center justify-center" style={{ background: 'rgb(255 255 255 / 0.18)' }}>
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
          </div>

        </div>
      </div>

      {/* Trust strip — anclado al fondo del hero */}
      {showFeatures && (
        <div
          className="animate-fade-in section-container relative pb-10 sm:pb-12"
          style={{ animationDelay: '450ms', animationFillMode: 'both' }}
        >
          <div className="max-w-5xl mx-auto pt-8 border-t border-edge/40 flex flex-wrap items-center justify-center gap-x-8 sm:gap-x-12 gap-y-4">
            {displayFeatures.map((feat, idx) => {
              const isObj    = typeof feat === 'object';
              const iconName = isObj ? feat.icon : defaults[idx]?.icon;
              const text     = isObj ? feat.text : (feat || defaults[idx]?.text);
              const Icon     = ICON_MAP[iconName] || HelpCircle;
              return (
                <div key={idx} className="flex items-center gap-2.5">
                  <span className="w-7 h-7 rounded-full bg-gold/10 text-gold flex items-center justify-center">
                    <Icon size={13} strokeWidth={2.2} />
                  </span>
                  <span className="text-[12px] font-bold uppercase tracking-[0.16em] text-ink-2">
                    {text}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}

function BackgroundDecoration() {
  return (
    <div aria-hidden className="absolute inset-0 pointer-events-none overflow-hidden">
      <div
        className="absolute -top-40 left-1/2 -translate-x-1/2 w-[900px] h-[900px] rounded-full opacity-[0.18] dark:opacity-[0.12]"
        style={{ background: 'radial-gradient(circle at center, rgb(var(--gold) / 0.5) 0%, transparent 60%)' }}
      />
      <div
        className="absolute inset-0 opacity-[0.04] dark:opacity-[0.06]"
        style={{
          backgroundImage: 'radial-gradient(rgb(var(--ink)) 1px, transparent 1px)',
          backgroundSize: '28px 28px',
          maskImage: 'linear-gradient(to bottom, black 0%, black 50%, transparent 100%)',
          WebkitMaskImage: 'linear-gradient(to bottom, black 0%, black 50%, transparent 100%)',
        }}
      />
    </div>
  );
}
