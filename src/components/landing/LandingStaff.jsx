import { useState, useRef, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { User, ChevronLeft, ChevronRight, ArrowUpRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { SectionHeader } from './LandingServices';

const VISIBLE_DESKTOP = 6;

export default function LandingStaff({ staff = [], customStaff, useCustom, title, subtitle }) {
  const allStaff = (useCustom && customStaff?.length > 0)
    ? customStaff
    : staff.length > 0
      ? staff.map(s => ({
          name: s.name,
          specialty: s.specialty || s.specialties || '',
          image: s.image || s.avatarUrl || s.avatar_url || null,
        }))
      : [
          { name: 'Ricardo Islas', specialty: 'Master Barber & Founder', image: null },
          { name: 'Ana González',  specialty: 'Color Expert',            image: null },
          { name: 'Carlos Reyes',  specialty: 'Stylist Senior',          image: null },
        ];

  const needsPagination = allStaff.length > VISIBLE_DESKTOP;
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
    <section id="equipo" className="relative py-24 lg:py-32 overflow-hidden bg-card/30">
      <div className="section-container">
        <SectionHeader
          eyebrow={title || 'Nuestro equipo'}
          title={subtitle}
          fallback={<>En manos de <span className="text-ink-3">los mejores.</span></>}
          right={
            needsPagination && (
              <div className="hidden md:flex items-center gap-2">
                <IconNav onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}>
                  <ChevronLeft size={16} />
                </IconNav>
                <span className="text-[11px] font-mono text-ink-3 min-w-[3ch] text-center tabular-nums">
                  {page + 1}/{totalPages}
                </span>
                <IconNav onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}>
                  <ChevronRight size={16} />
                </IconNav>
              </div>
            )
          }
        />

        {/* Desktop grid */}
        <div className="hidden md:grid grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8 mt-14 lg:mt-16">
          {displayStaff.map((member, i) => (
            <StaffCard key={(member.name || '') + i + page} member={member} i={i} />
          ))}
        </div>

        {/* Mobile slider */}
        <div ref={scrollRef} className="md:hidden flex gap-4 overflow-x-auto snap-x snap-mandatory scrollbar-hide pb-4 mt-10">
          {allStaff.map((member, i) => (
            <div key={(member.name || '') + i} className="snap-center shrink-0 w-[72vw] max-w-[300px] first:ml-[14vw] last:mr-[14vw]">
              <StaffCard member={member} i={i} />
            </div>
          ))}
        </div>

        {allStaff.length > 1 && (
          <div className="flex md:hidden flex-col items-center gap-3 mt-6">
            <div className="flex items-center gap-1.5">
              {allStaff.map((_, i) => (
                <button key={i} onClick={() => scrollToSlide(i)} aria-label={`Miembro ${i + 1}`}
                  className={`rounded-full transition-all duration-300 ${activeSlide === i ? 'w-6 h-1.5 bg-gold' : 'w-1.5 h-1.5 bg-ink/15'}`} />
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

function StaffCard({ member, i }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ delay: Math.min(i * 0.05, 0.3), duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
      className="group"
    >
      <Link to="/agendar" className="block">
        <div className="relative aspect-[3/4] rounded-[28px] overflow-hidden bg-raised">
          {member.image ? (
            <img
              src={member.image}
              alt={member.name}
              loading="lazy"
              className="absolute inset-0 w-full h-full object-cover transition-transform duration-[800ms] ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-[1.04]"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-raised to-card">
              <User size={64} strokeWidth={0.9} className="text-ink/10" />
            </div>
          )}

          {/* Dark fade bottom for name legibility */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/0 to-transparent" />

          {/* Name + specialty overlay */}
          <div className="absolute inset-x-0 bottom-0 p-5 lg:p-6">
            <h3 className="text-white text-lg lg:text-xl font-semibold tracking-tight">{member.name}</h3>
            {member.specialty && (
              <p className="mt-1 text-[10px] lg:text-[11px] font-bold uppercase tracking-[0.18em] text-white/70">
                {member.specialty}
              </p>
            )}
          </div>

          {/* Hover affordance */}
          <div className="absolute top-4 right-4 w-9 h-9 rounded-full bg-card/85 backdrop-blur-md text-ink flex items-center justify-center opacity-0 -translate-y-1 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300">
            <ArrowUpRight size={14} strokeWidth={2.4} />
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

function IconNav({ children, onClick, disabled }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="w-9 h-9 rounded-full border border-edge flex items-center justify-center text-ink-2 hover:bg-ink hover:border-ink hover:text-card disabled:opacity-25 disabled:cursor-not-allowed transition-colors"
    >
      {children}
    </button>
  );
}
