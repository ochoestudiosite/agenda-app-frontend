import { Star } from 'lucide-react';
import { SectionHeader } from './LandingServices';

// ─── Defaults ────────────────────────────────────────────────────────────────
const DEFAULTS = [
  { text: 'La atención al detalle es simplemente otro nivel. Mi experiencia superó todas las expectativas que tenía.', author: 'Juan Pérez',    role: 'Cliente desde 2023', rating: 5 },
  { text: 'El sistema de reserva es increíblemente fluido. Encontrar un espacio con mi especialista favorito nunca fue tan fácil.', author: 'Miguel Torres', role: 'Empresario', rating: 5 },
  { text: 'Ambiente impecable y resultados consistentes. Es el único lugar donde confío plenamente mi imagen.', author: 'Daniel R.',     role: 'Diseñador',  rating: 5 },
  { text: 'Cada visita es mejor que la anterior. El equipo es profesional, atento y los resultados son exactamente lo que buscaba.', author: 'Carlos M.',    role: 'Arquitecto', rating: 5 },
  { text: 'Reservar nunca había sido tan sencillo. La atención personalizada y la puntualidad marcan la diferencia.', author: 'Roberto S.',   role: 'Fotógrafo',  rating: 5 },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────
function initials(name = '') {
  return name.trim().split(/\s+/).slice(0, 2).map(w => w[0] || '').join('').toUpperCase() || '?';
}

function StarRow({ count = 5 }) {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: Math.min(count, 5) }).map((_, i) => (
        <Star key={i} size={12} fill="currentColor" className="text-gold" />
      ))}
    </div>
  );
}

// ─── Card ─────────────────────────────────────────────────────────────────────
function Card({ t }) {
  return (
    <figure className="w-[272px] sm:w-[320px] shrink-0 flex flex-col gap-4 p-6 rounded-[22px] border border-section-contrast-text/[0.09] bg-section-contrast-text/[0.045] backdrop-blur-sm select-none">
      <StarRow count={t.rating || 5} />
      <blockquote className="flex-1 text-[13.5px] sm:text-[14px] leading-[1.75] text-section-contrast-text/80 font-medium">
        "{t.text}"
      </blockquote>
      <figcaption className="flex items-center gap-3 pt-4 border-t border-section-contrast-text/[0.09]">
        <div
          className="w-8 h-8 rounded-full shrink-0 flex items-center justify-center text-[11px] font-extrabold text-on-gold"
          style={{ background: 'linear-gradient(135deg, rgba(var(--gold),0.75) 0%, rgb(var(--gold)) 100%)' }}
        >
          {initials(t.author)}
        </div>
        <div className="min-w-0">
          <p className="text-[13px] font-semibold text-section-contrast-text leading-tight truncate">{t.author}</p>
          {t.role && (
            <p className="text-[10px] uppercase tracking-[0.14em] font-semibold text-section-contrast-muted truncate">{t.role}</p>
          )}
        </div>
      </figcaption>
    </figure>
  );
}

// ─── Marquee row ─────────────────────────────────────────────────────────────
// items must already be duplicated (track = [...original, ...original])
// so that translateX(-50%) creates a seamless loop.
function MarqueeRow({ items, duration, delay = '0s', reverse = false }) {
  const track = [...items, ...items];
  const animName = reverse ? 'lndMarqueeR' : 'lndMarquee';
  return (
    <div className="overflow-hidden [mask-image:linear-gradient(to_right,transparent_0%,black_6%,black_94%,transparent_100%)]">
      <div
        className="flex gap-4 w-max py-1"
        style={{ animation: `${animName} ${duration} linear infinite`, animationDelay: delay }}
        onMouseEnter={e => (e.currentTarget.style.animationPlayState = 'paused')}
        onMouseLeave={e => (e.currentTarget.style.animationPlayState = 'running')}
      >
        {track.map((t, i) => <Card key={i} t={t} />)}
      </div>
    </div>
  );
}

// ─── Section ─────────────────────────────────────────────────────────────────
export default function LandingTestimonials({ items = [], title, subtitle, subtitleAccent }) {
  const base = items.length > 0 ? items : DEFAULTS;
  // Ensure enough unique cards so the loop doesn't look too short before duplication
  const padded = base.length < 4
    ? [...base, ...base, ...base].slice(0, base.length * 3)
    : base;
  // Row 2 shows cards in a different order so both rows look distinct
  const row2 = [...padded].reverse();

  return (
    <section
      id="testimoniales"
      className="relative py-24 lg:py-32 overflow-hidden bg-section-contrast text-section-contrast-text"
    >
      {/* Ambient gold glow */}
      <div aria-hidden className="absolute -top-40 right-0 w-[560px] h-[560px] rounded-full opacity-[0.17] pointer-events-none"
           style={{ background: 'radial-gradient(circle, rgb(var(--gold) / 0.7) 0%, transparent 65%)' }} />
      <div aria-hidden className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-section-contrast-text/10 to-transparent" />

      {/* ── Section header ── */}
      <div className="section-container relative mb-14 lg:mb-16">
        <SectionHeader
          eyebrow={title || 'Testimoniales'}
          title={subtitle}
          accent={subtitleAccent}
          fallback={<>Lo que dicen <span className="text-section-contrast-muted">nuestros clientes.</span></>}
        />
      </div>

      {/* ── Marquee (hidden when motion reduced) ── */}
      <div className="motion-reduce:hidden flex flex-col gap-4">
        {/* Row 1 — right to left */}
        <MarqueeRow items={padded} duration="58s" delay="0s" />
        {/* Row 2 — left to right, different speed for depth */}
        <MarqueeRow items={row2}   duration="72s" delay="-18s" reverse />
      </div>

      {/* ── Reduced-motion fallback: static responsive grid ── */}
      <div className="hidden motion-reduce:block section-container">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 mt-4">
          {base.map((t, i) => <Card key={i} t={t} />)}
        </div>
      </div>

      {/* Scoped keyframes — avoids polluting the global animation registry */}
      <style>{`
        @keyframes lndMarquee  { from { transform: translateX(0);    } to { transform: translateX(-50%); } }
        @keyframes lndMarqueeR { from { transform: translateX(-50%); } to { transform: translateX(0);    } }
      `}</style>
    </section>
  );
}
