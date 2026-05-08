import { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { User, Award, ChevronLeft, ChevronRight } from 'lucide-react';

const VISIBLE_DESKTOP = 6;

export default function LandingStaff({ staff = [], customStaff, useCustom, title, subtitle }) {
  const allStaff = (useCustom && customStaff?.length > 0)
    ? customStaff
    : staff.length > 0 ? staff.map(s => ({
        name: s.name,
        specialty: s.specialty || s.specialties || '',
        image: s.image || s.avatarUrl || s.avatar_url || null,
      })) : [
        { name: 'Ricardo Islas', specialty: 'Master Barber & Founder', image: null },
        { name: 'Ana González', specialty: 'Color Expert', image: null },
        { name: 'Carlos Reyes', specialty: 'Stylist Senior', image: null },
      ];

  const needsPagination = allStaff.length > VISIBLE_DESKTOP;
  const [page, setPage] = useState(0);
  const totalPages = Math.ceil(allStaff.length / VISIBLE_DESKTOP);
  const displayStaff = needsPagination
    ? allStaff.slice(page * VISIBLE_DESKTOP, (page + 1) * VISIBLE_DESKTOP)
    : allStaff;

  const scrollRef = useRef(null);
  const scrollBy = (dir) => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollBy({ left: dir * 260, behavior: 'smooth' });
  };

  return (
    <section id="equipo" className="py-20 md:py-24 overflow-hidden">
      <div className="section-container">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 md:mb-16 gap-4 md:gap-6">
          <div className="flex-1">
            <div className="flex items-center gap-2 text-gold font-bold text-xs uppercase tracking-widest mb-3">
              <Award size={14} />
              {title || 'Mentes Maestras'}
            </div>
            <h2 className="text-3xl md:text-5xl font-bold text-ink tracking-tightest leading-tight">
              {subtitle ? subtitle : (<>En manos de <span className="text-ink-3">los mejores.</span></>)}
            </h2>
          </div>
          <div className="flex items-center gap-2">
            {/* Desktop pagination */}
            {needsPagination && (
              <div className="hidden md:flex items-center gap-2">
                <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}
                  className="w-10 h-10 rounded-full border border-edge flex items-center justify-center hover:bg-ink hover:text-surface transition-all disabled:opacity-20 disabled:cursor-not-allowed">
                  <ChevronLeft size={18} />
                </button>
                <span className="text-xs font-bold text-ink-3 min-w-[3ch] text-center">{page + 1}/{totalPages}</span>
                <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}
                  className="w-10 h-10 rounded-full border border-edge flex items-center justify-center hover:bg-ink hover:text-surface transition-all disabled:opacity-20 disabled:cursor-not-allowed">
                  <ChevronRight size={18} />
                </button>
              </div>
            )}
            {/* Mobile slider arrows */}
            {allStaff.length > 2 && (
              <div className="flex md:hidden items-center gap-2">
                <button onClick={() => scrollBy(-1)}
                  className="w-9 h-9 rounded-full border border-edge flex items-center justify-center text-ink/60 active:bg-ink active:text-surface transition-all">
                  <ChevronLeft size={16} />
                </button>
                <button onClick={() => scrollBy(1)}
                  className="w-9 h-9 rounded-full border border-edge flex items-center justify-center text-ink/60 active:bg-ink active:text-surface transition-all">
                  <ChevronRight size={16} />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Desktop grid */}
        <div className="hidden md:grid grid-cols-2 lg:grid-cols-3 gap-8">
          {displayStaff.map((member, i) => (
            <StaffCard key={(member.name || '') + i + page} member={member} i={i} />
          ))}
        </div>

        {/* Mobile horizontal slider */}
        <div ref={scrollRef} className="md:hidden flex gap-5 overflow-x-auto snap-x snap-mandatory scrollbar-hide pb-4 -mx-6 px-6">
          {allStaff.map((member, i) => (
            <div key={(member.name || '') + i} className="snap-start shrink-0 w-[70vw] max-w-[280px]">
              <StaffCard member={member} i={i} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function StaffCard({ member, i }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: i * 0.06, duration: 0.3 }}
      className="group"
    >
      <div className="relative aspect-[3/4] rounded-[2rem] overflow-hidden bg-raised mb-5"
        style={{ boxShadow: '0 8px 30px rgb(0 0 0 / 0.08)' }}>
        <div className="absolute inset-0 bg-gradient-to-t from-ink/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 z-10" />
        {member.image ? (
          <img src={member.image} alt={member.name} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-raised to-edge/20 text-ink/8">
            <User size={80} strokeWidth={0.8} />
          </div>
        )}
      </div>
      <div className="text-center px-2">
        <h3 className="text-lg font-bold text-ink tracking-tighter2 mb-0.5">{member.name}</h3>
        <p className="text-xs font-semibold text-ink-3 uppercase tracking-wider">{member.specialty}</p>
      </div>
    </motion.div>
  );
}
