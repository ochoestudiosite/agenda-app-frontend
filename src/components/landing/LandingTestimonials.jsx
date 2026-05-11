import { Star } from 'lucide-react';
import { SectionHeader } from './LandingServices';

// ─── Defaults ────────────────────────────────────────────────────────────────
const DEFAULTS = [
  { text: 'La atención al detalle es simplemente otro nivel. Mi experiencia superó todas las expectativas que tenía.', author: 'Juan Pérez',    role: 'Cliente desde 2023', rating: 5 },
  { text: 'El sistema de reserva es increíblemente fluido. Encontrar un espacio con mi especialista favorito nunca fue tan fácil.', author: 'Miguel Torres', role: 'Empresario',          rating: 5 },
  { text: 'Ambiente impecable y resultados consistentes. Es el único lugar donde confío plenamente mi imagen.',         author: 'Daniel R.',     role: 'Diseñador',           rating: 5 },
  { text: 'Cada visita supera la anterior. El equipo es profesional, atento y el resultado es exactamente lo que buscaba.', author: 'Carlos M.',    role: 'Arquitecto',          rating: 5 },
  { text: 'Reservar nunca había sido tan sencillo. La atención personalizada y la puntualidad marcan la diferencia.',   author: 'Roberto S.',   role: 'Fotógrafo',           rating: 5 },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────
function initials(name = '') {
  return name.trim().split(/\s+/).slice(0, 2).map(w => w[0] || '').join('').toUpperCase() || '?';
}

// ─── Card ─────────────────────────────────────────────────────────────────────
function Card({ t }) {
  return (
    <figure
      className="lnd-card shrink-0 flex flex-col gap-4 p-6 rounded-[20px] border border-section-contrast-text/10 bg-section-contrast-text/[0.045]"
    >
      {/* Stars */}
      <div className="flex gap-0.5">
        {Array.from({ length: Math.min(t.rating || 5, 5) }).map((_, i) => (
          <Star key={i} size={12} fill="currentColor" className="text-gold" />
        ))}
      </div>

      {/* Quote */}
      <blockquote className="flex-1 text-[13.5px] leading-[1.75] text-section-contrast-text/80 font-medium">
        "{t.text}"
      </blockquote>

      {/* Author */}
      <figcaption className="flex items-center gap-3 pt-4 border-t border-section-contrast-text/10">
        <div
          className="w-8 h-8 rounded-full shrink-0 flex items-center justify-center text-[10px] font-extrabold text-on-gold select-none"
          style={{ background: 'linear-gradient(135deg, rgb(var(--gold-light)) 0%, rgb(var(--gold)) 100%)' }}
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

// ─── MarqueeRow ───────────────────────────────────────────────────────────────
// Each row duplicates items so translateX(-50%) creates a seamless loop.
// Gradient overlay divs replace mask-image for full cross-browser support.
function MarqueeRow({ items, animClass, delay }) {
  const track = [...items, ...items];
  return (
    <div className="lnd-row-outer">
      {/* fade left — matches section background color */}
      <div className="lnd-fade lnd-fade-l" aria-hidden="true" />
      {/* fade right */}
      <div className="lnd-fade lnd-fade-r" aria-hidden="true" />

      <div
        className={`lnd-track ${animClass}`}
        style={delay ? { animationDelay: delay } : undefined}
        onMouseEnter={e => { e.currentTarget.style.animationPlayState = 'paused'; }}
        onMouseLeave={e => { e.currentTarget.style.animationPlayState = 'running'; }}
      >
        {track.map((t, i) => <Card key={i} t={t} />)}
      </div>
    </div>
  );
}

// ─── Section ─────────────────────────────────────────────────────────────────
export default function LandingTestimonials({ items = [], title, subtitle, subtitleAccent }) {
  const base    = items.length > 0 ? items : DEFAULTS;
  // Ensure enough cards to fill even a 4K screen before duplication
  const padded  = base.length < 5 ? [...base, ...base].slice(0, base.length * 2) : base;
  const row2    = [...padded].reverse();

  return (
    <section
      id="testimoniales"
      className="relative py-24 lg:py-32 overflow-hidden bg-section-contrast text-section-contrast-text"
    >
      {/* Ambient gold glow */}
      <div
        aria-hidden="true"
        className="absolute -top-40 right-0 w-[560px] h-[560px] rounded-full opacity-[0.17] pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgb(var(--gold) / 0.7) 0%, transparent 65%)' }}
      />
      <div aria-hidden="true" className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-section-contrast-text/10 to-transparent" />

      {/* ── Header ── */}
      <div className="section-container relative mb-14 lg:mb-16">
        <SectionHeader
          eyebrow={title || 'Testimoniales'}
          title={subtitle}
          accent={subtitleAccent}
          fallback={<>Lo que dicen <span className="text-section-contrast-muted">nuestros clientes.</span></>}
        />
      </div>

      {/* ── Marquee rows (motion-safe) ── */}
      <div className="lnd-rows">
        <MarqueeRow items={padded} animClass="lnd-fwd" />
        <MarqueeRow items={row2}   animClass="lnd-rev" delay="-20s" />
      </div>

      {/* ── Static fallback (prefers-reduced-motion) ── */}
      <div className="lnd-fallback section-container">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 pt-4">
          {base.map((t, i) => <Card key={i} t={t} />)}
        </div>
      </div>

      {/* ── Scoped styles ────────────────────────────────────────────────────
           All animation CSS lives here so it works on every browser without
           Tailwind JIT arbitrary-value limitations or missing vendor prefixes.
           Gradient overlays replace mask-image for full Safari/iOS support.
      ─────────────────────────────────────────────────────────────────────── */}
      <style>{`
        /* Card fixed width — set via CSS so the -50% transform is correct */
        .lnd-card { width: 288px; }
        @media (min-width: 640px) { .lnd-card { width: 320px; } }

        /* Marquee container rows */
        .lnd-rows    { display: flex; flex-direction: column; gap: 16px; }
        .lnd-fallback { display: none; }

        /* Row wrapper: clips the overflowing track */
        .lnd-row-outer { position: relative; overflow: hidden; }

        /* Animated track */
        .lnd-track {
          display: flex;
          gap: 16px;
          width: max-content;
          padding: 4px 0;
          will-change: transform;
          animation-timing-function: linear;
          animation-iteration-count: infinite;
          animation-play-state: running;
        }
        .lnd-fwd { animation-name: lndMarquee;  animation-duration: 58s; }
        .lnd-rev { animation-name: lndMarqueeR; animation-duration: 72s; }

        /* Edge fade overlays — gradient matches section background token */
        .lnd-fade {
          position: absolute;
          top: 0; bottom: 0;
          width: 80px;
          z-index: 10;
          pointer-events: none;
        }
        .lnd-fade-l {
          left: 0;
          background: linear-gradient(to right, rgb(var(--section-contrast)) 0%, transparent 100%);
        }
        .lnd-fade-r {
          right: 0;
          background: linear-gradient(to left, rgb(var(--section-contrast)) 0%, transparent 100%);
        }

        /* Keyframes */
        @keyframes lndMarquee  { from { transform: translateX(0);    } to { transform: translateX(-50%); } }
        @keyframes lndMarqueeR { from { transform: translateX(-50%); } to { transform: translateX(0);    } }

        /* Accessibility: swap marquee for static grid when motion is reduced */
        @media (prefers-reduced-motion: reduce) {
          .lnd-rows     { display: none; }
          .lnd-fallback { display: block; }
        }
      `}</style>
    </section>
  );
}
