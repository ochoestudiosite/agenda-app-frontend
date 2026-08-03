import { useState, useRef, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight, ArrowUpRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { SectionHeader } from './LandingServices';

const VISIBLE_DESKTOP = 6;

export default function LandingStaff({ staff = [], services = [], title, subtitle, subtitleAccent }) {
  const allStaff = staff.length > 0
      ? staff.map(s => ({
          name: s.name,
          specialty: s.specialty || s.specialties || '',
          image: s.image || s.avatarUrl || s.avatar_url || null,
          bio: s.bio || null,
          initials: s.initials || (s.name ? s.name.split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase() : '??'),
          serviceIds: s.serviceIds || s.service_ids || [],
        }))
      : [
          { name: 'Ricardo Islas', specialty: 'Master Barber & Founder', image: null, bio: 'Más de 15 años transformando estilos con técnica y pasión.', initials: 'RI', serviceIds: [] },
          { name: 'Ana González',  specialty: 'Color Expert',            image: null, bio: 'Especialista en colorimetría, balayage y mechas de alta precisión.', initials: 'AG', serviceIds: [] },
          { name: 'Carlos Reyes',  specialty: 'Stylist Senior',          image: null, bio: 'Cortes de alta precisión y estilizado para cualquier tipo de cabello.', initials: 'CR', serviceIds: [] },
        ];

  const isSolo = allStaff.length === 1;
  const needsPagination = !isSolo && allStaff.length > VISIBLE_DESKTOP;
  const [page, setPage] = useState(0);
  const totalPages = Math.ceil(allStaff.length / VISIBLE_DESKTOP);
  const displayStaff = needsPagination
    ? allStaff.slice(page * VISIBLE_DESKTOP, (page + 1) * VISIBLE_DESKTOP)
    : allStaff;

  const scrollRef = useRef(null);
  const [activeSlide, setActiveSlide] = useState(0);

  const scrollToSlide = useCallback((idx) => {
    const c = scrollRef.current;
    if (!c) return;
    const cards = c.children;
    if (cards[idx]) {
      const card = cards[idx];
      const scrollLeft = card.offsetLeft - (c.offsetWidth / 2) + (card.offsetWidth / 2);
      c.scrollTo({ left: scrollLeft, behavior: 'smooth' });
    }
  }, []);

  const handleScroll = useCallback(() => {
    const c = scrollRef.current;
    if (!c) return;
    const center = c.scrollLeft + c.offsetWidth / 2;
    let closest = 0, closestDist = Infinity;
    Array.from(c.children).forEach((child, i) => {
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
    <section id="equipo" className="relative py-24 lg:py-32 overflow-hidden bg-surface">
      <div className="section-container">
        <SectionHeader
          eyebrow={title || 'Nuestro equipo'}
          title={subtitle}
          accent={subtitleAccent}
          fallback={<>En manos de <span className="text-ink-3">los mejores.</span></>}
          right={
            needsPagination && (
              <div className="hidden md:flex items-center gap-2">
                <IconNav onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}>
                  <ChevronLeft size={16} />
                </IconNav>
                <span className="text-[12px] font-mono text-ink-3 min-w-[3ch] text-center tabular-nums">
                  {page + 1}/{totalPages}
                </span>
                <IconNav onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}>
                  <ChevronRight size={16} />
                </IconNav>
              </div>
            )
          }
        />

        {isSolo ? (
          <StaffSpotlight member={allStaff[0]} services={services} />
        ) : (
          <>
            {/* Desktop grid */}
            <div className="hidden md:grid grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8 mt-14 lg:mt-16">
              {displayStaff.map((member, i) => (
                <StaffCard key={page * VISIBLE_DESKTOP + i} member={member} services={services} i={i} />
              ))}
            </div>

            {/* Mobile slider */}
            <div ref={scrollRef} className="md:hidden flex gap-4 overflow-x-auto snap-x snap-mandatory scrollbar-hide pb-4 mt-10">
              {allStaff.map((member, i) => (
                <div key={(member.name || '') + i} className="snap-center shrink-0 w-[82vw] max-w-[340px] first:ml-[9vw] last:mr-[9vw]">
                  <StaffCard member={member} services={services} i={i} />
                </div>
              ))}
            </div>

            {allStaff.length > 1 && (
              <div className="flex md:hidden flex-col items-center gap-3 mt-6">
                <div className="flex items-center gap-1.5">
                  {allStaff.map((_, i) => (
                    <button key={i} onClick={() => scrollToSlide(i)} aria-label={`Colaborador ${i + 1}`}
                      className={`rounded-full transition-all duration-300 ${activeSlide === i ? 'w-6 h-1.5 bg-gold' : 'w-1.5 h-1.5 bg-ink/15'}`} />
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
}

function StaffCard({ member, services, i }) {
  const allMemberServices = services.filter(s =>
    (member.serviceIds || []).some(id => Number(id) === Number(s.dbId))
  );
  // Un solo pill, en cualquier breakpoint: dos nombres de servicio de largo
  // variable compitiendo por el mismo renglón es lo que originalmente los
  // cortaba a media palabra. Con uno solo, el pill siempre tiene todo el
  // ancho de la card disponible y solo se achica en el caso extremo de un
  // nombre de servicio realmente larguísimo.
  const firstService = allMemberServices[0];
  const extraCount = Math.max(0, allMemberServices.length - 1);

  return (
    <div
      className="group animate-fade-up"
      style={{ animationDelay: `${Math.min(i * 50, 300)}ms`, animationFillMode: 'both' }}
    >
      <Link to="/agendar" className="block">
        <div className="relative aspect-[4/5] sm:aspect-[5/6] w-full rounded-[28px] landing-card-shape overflow-hidden bg-raised">

          {/* Photo */}
          {/* Placeholder — siempre visible mientras carga o si no hay imagen */}
          <div className="absolute inset-0 flex items-center justify-center
                          bg-gradient-to-br from-raised via-card to-raised">
            <span className="font-display text-7xl font-bold text-ink/10 select-none tracking-tight">
              {member.initials}
            </span>
          </div>

          {/* Imagen encima — fade-in al cargar */}
          {member.image && (
            <img
              src={member.image}
              alt={member.name}
              loading="lazy"
              className="absolute inset-0 w-full h-full object-cover object-top group-hover:scale-[1.04]"
              style={{ opacity: 0, transition: 'opacity 200ms ease, transform 800ms cubic-bezier(0.16,1,0.3,1)' }}
              onLoad={e  => { e.currentTarget.style.opacity = '1'; }}
              onError={e => { e.currentTarget.style.display = 'none'; }}
            />
          )}

          {/* Dark gradient for text legibility — stronger than services to cubrir specialty + pills */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent" />

          {/* Hover arrow */}
          <div className="absolute top-4 right-4 w-9 h-9 rounded-full bg-card/85 backdrop-blur-md
                         flex items-center justify-center text-ink
                         opacity-0 -translate-y-1
                         group-hover:opacity-100 group-hover:translate-y-0
                         transition-all duration-300">
            <ArrowUpRight size={14} strokeWidth={2.4} />
          </div>

          {/* Text overlay */}
          <div className="absolute inset-x-0 bottom-0 p-5 lg:p-6">

            {/* Service pill — uno solo, con todo el ancho de la card
                disponible; solo se achica (con elipsis) en el caso extremo
                de un nombre de servicio realmente larguísimo. */}
            {firstService && (
              <div className="flex items-center gap-1.5 mb-3 max-w-full">
                <span className="inline-flex min-w-0 shrink items-center px-2.5 py-1 rounded-full
                                 bg-white/[0.12] border border-white/20 text-white/85
                                 text-[11px] font-semibold tracking-[0.04em] backdrop-blur-sm truncate">
                  {firstService.name}
                </span>
                {extraCount > 0 && (
                  <span className="shrink-0 inline-flex items-center px-2.5 py-1 rounded-full
                                   border border-white/20 text-white/50
                                   text-[11px] font-medium tabular-nums">
                    +{extraCount}
                  </span>
                )}
              </div>
            )}

            {/* Name */}
            <h3 className="text-white text-xl lg:text-2xl font-semibold tracking-tight drop-shadow-md">
              {member.name}
            </h3>

            {/* Specialty */}
            {member.specialty && (
              <p className="mt-1 text-[0.8125rem] text-white/65 leading-snug line-clamp-2">
                {member.specialty}
              </p>
            )}
          </div>
        </div>
      </Link>
    </div>
  );
}

// Cuando hay un único especialista, el grid/slider deja la mitad (o dos
// tercios) de la sección vacía. En su lugar mostramos un layout "spotlight":
// foto grande a un lado, info editorial (nombre, bio, servicios) al otro,
// aprovechando todo el ancho disponible.
function StaffSpotlight({ member, services }) {
  const memberServices = services.filter(s =>
    (member.serviceIds || []).some(id => Number(id) === Number(s.dbId))
  );

  return (
    <div className="mt-14 lg:mt-16 grid md:grid-cols-[minmax(0,420px)_1fr] lg:grid-cols-[460px_1fr] gap-8 lg:gap-16 items-center animate-fade-up">
      {/* Photo */}
      <Link to="/agendar" className="group block relative aspect-[4/5] w-full max-w-sm mx-auto md:max-w-none rounded-[32px] landing-card-shape overflow-hidden bg-raised">
        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-raised via-card to-raised">
          <span className="font-display text-8xl font-bold text-ink/10 select-none tracking-tight">
            {member.initials}
          </span>
        </div>

        {member.image && (
          <img
            src={member.image}
            alt={member.name}
            loading="lazy"
            className="absolute inset-0 w-full h-full object-cover object-top group-hover:scale-[1.03]"
            style={{ opacity: 0, transition: 'opacity 200ms ease, transform 800ms cubic-bezier(0.16,1,0.3,1)' }}
            onLoad={e  => { e.currentTarget.style.opacity = '1'; }}
            onError={e => { e.currentTarget.style.display = 'none'; }}
          />
        )}

        <div className="absolute top-4 right-4 w-9 h-9 rounded-full bg-card/85 backdrop-blur-md
                       flex items-center justify-center text-ink
                       opacity-0 -translate-y-1
                       group-hover:opacity-100 group-hover:translate-y-0
                       transition-all duration-300">
          <ArrowUpRight size={14} strokeWidth={2.4} />
        </div>
      </Link>

      {/* Info panel */}
      <div className="text-center md:text-left">
        {member.specialty && (
          <div className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.22em] text-gold mb-4">
            <span className="w-6 h-px bg-gold" />
            {member.specialty}
          </div>
        )}

        <h3 className="font-display text-3xl sm:text-4xl lg:text-[44px] font-semibold text-ink tracking-[-0.025em] leading-[1.05] text-balance">
          {member.name}
        </h3>

        {member.bio && (
          <p className="mt-4 text-[15px] leading-relaxed text-ink-2 max-w-md mx-auto md:mx-0">
            {member.bio}
          </p>
        )}

        {memberServices.length > 0 && (
          <div className="mt-6 flex flex-wrap justify-center md:justify-start gap-2 max-w-lg mx-auto md:mx-0">
            {memberServices.map(svc => (
              <span
                key={svc.id}
                className="inline-flex items-center px-3.5 py-1.5 rounded-full bg-raised border border-edge
                           text-[12px] font-semibold text-ink-2 tracking-[0.02em]"
              >
                {svc.name}
              </span>
            ))}
          </div>
        )}

        <Link
          to="/agendar"
          className="mt-8 inline-flex items-center gap-2 bg-gold text-on-gold px-6 h-12 rounded-full
                     text-[13px] font-bold hover:opacity-90 active:scale-[0.98] transition-all
                     shadow-[0_8px_24px_rgba(0,0,0,0.12)]"
        >
          Reservar cita
          <ArrowUpRight size={15} strokeWidth={2.4} />
        </Link>
      </div>
    </div>
  );
}

function IconNav({ children, onClick, disabled }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="w-9 h-9 rounded-full border border-edge flex items-center justify-center
                 text-ink-2 hover:bg-ink hover:border-ink hover:text-card
                 disabled:opacity-25 disabled:cursor-not-allowed transition-colors"
    >
      {children}
    </button>
  );
}
