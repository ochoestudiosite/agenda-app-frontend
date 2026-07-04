import { Star } from 'lucide-react';
import { SectionHeader } from './LandingServices';

// ─── Defaults ────────────────────────────────────────────────────────────────
const DEFAULTS = [
  { text: 'La atención al detalle es simplemente otro nivel. Mi experiencia superó todas las expectativas que tenía.', author: 'Juan Pérez',    role: 'Cliente desde 2023', rating: 5 },
  { text: 'El sistema de reserva es increíblemente fluido. Encontrar un espacio con mi especialista favorito nunca fue tan fácil.', author: 'Miguel Torres', role: 'Empresario',          rating: 5 },
  { text: 'Ambiente impecable y resultados consistentes. Es el único lugar donde confío plenamente mi imagen.',         author: 'Daniel R.',     role: 'Diseñador',           rating: 5 },
  { text: 'Cada visita supera la anterior. El equipo es profesional, atento y el resultado es exactamente lo que buscaba.', author: 'Carlos M.',    role: 'Arquitecto',          rating: 5 },
  { text: 'Reservar nunca había sido tan sencillo. La atención personalizada y la puntualidad marcan toda la diferencia.', author: 'Roberto S.',   role: 'Fotógrafo',           rating: 5 },
];

function initials(name = '') {
  return name.trim().split(/\s+/).slice(0, 2).map(w => w[0] || '').join('').toUpperCase() || '?';
}

// ─── Card ─────────────────────────────────────────────────────────────────────
function Card({ t }) {
  return (
    <figure
      className="w-72 sm:w-80 shrink-0 flex flex-col gap-4 p-6 rounded-[20px] landing-card-shape border border-section-contrast-text/10 bg-section-contrast-text/[0.05]"
    >
      {/* Stars */}
      <div className="flex gap-0.5">
        {Array.from({ length: Math.min(t.rating || 5, 5) }).map((_, i) => (
          <Star key={i} size={12} fill="currentColor" className="text-gold" />
        ))}
      </div>

      {/* Quote */}
      <blockquote className="flex-1 text-[14px] leading-[1.75] text-section-contrast-text/80 font-medium">
        "{t.text}"
      </blockquote>

      {/* Author */}
      <figcaption className="flex items-center gap-3 pt-4 border-t border-section-contrast-text/10">
        <div
          className="w-9 h-9 rounded-full shrink-0 flex items-center justify-center text-[12px] font-extrabold text-on-gold select-none"
          style={{ background: 'linear-gradient(135deg, rgb(var(--gold-light)) 0%, rgb(var(--gold)) 100%)' }}
        >
          {initials(t.author)}
        </div>
        <div className="min-w-0">
          <p className="text-[13px] font-semibold text-section-contrast-text leading-tight truncate">{t.author}</p>
          {t.role && (
            <p className="text-[11px] uppercase tracking-[0.14em] font-semibold text-section-contrast-muted truncate">{t.role}</p>
          )}
        </div>
      </figcaption>
    </figure>
  );
}

// ─── Section ─────────────────────────────────────────────────────────────────
export default function LandingTestimonials({ items = [], title, subtitle, subtitleAccent }) {
  const base = items.length > 0 ? items : DEFAULTS;

  // The invariant for a seamless translateX(-50%) loop is:
  //   set_width ≥ viewport_width
  // Each card slot = w-80 (320px) + gap-4 (16px) = 336px.
  // We target 4096px minimum per half (covers 4K monitors).
  // The animation duration scales proportionally so px/s stays constant.
  const CARD_SLOT_PX = 336;
  const MIN_HALF_PX  = 4096;
  const copies       = Math.max(1, Math.ceil(MIN_HALF_PX / (base.length * CARD_SLOT_PX)));
  const source       = Array.from({ length: copies }, () => base).flat();
  const track        = [...source, ...source];
  const animDuration = `${40 * copies}s`;

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
      <div
        aria-hidden="true"
        className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-section-contrast-text/10 to-transparent"
      />

      {/* ── Header ── */}
      <div className="section-container relative mb-14 lg:mb-16">
        <SectionHeader
          eyebrow={title || 'Testimoniales'}
          title={subtitle}
          accent={subtitleAccent}
          fallback={<>Lo que dicen <span className="text-section-contrast-muted">nuestros clientes.</span></>}
        />
      </div>

      {/* ── Marquee — edge-to-edge, same pattern as cita24-landing ── */}
      <div
        className="relative overflow-hidden"
        style={{ paddingBottom: 8 }}
      >
        {/* Left fade: covers first/last card edges cleanly */}
        <div
          aria-hidden="true"
          className="absolute inset-y-0 left-0 w-20 z-10 pointer-events-none"
          style={{ background: 'linear-gradient(to right, rgb(var(--section-contrast)), transparent)' }}
        />
        {/* Right fade */}
        <div
          aria-hidden="true"
          className="absolute inset-y-0 right-0 w-20 z-10 pointer-events-none"
          style={{ background: 'linear-gradient(to left, rgb(var(--section-contrast)), transparent)' }}
        />

        {/* Scrolling track — duration scales with copies to keep constant px/s */}
        <div
          className="flex gap-4 w-max py-2 animate-scroll-left"
          style={{ willChange: 'transform', animationDuration: animDuration }}
          onMouseEnter={e => { e.currentTarget.style.animationPlayState = 'paused'; }}
          onMouseLeave={e => { e.currentTarget.style.animationPlayState = 'running'; }}
        >
          {track.map((t, i) => <Card key={`${t.author}-${i}`} t={t} />)}
        </div>
      </div>
    </section>
  );
}
