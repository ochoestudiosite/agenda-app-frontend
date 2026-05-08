import { useState } from 'react';
import { motion } from 'framer-motion';
import { User, Award, ChevronLeft, ChevronRight } from 'lucide-react';

const VISIBLE_COUNT = 6;

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

  const needsCarousel = allStaff.length > VISIBLE_COUNT;
  const [page, setPage] = useState(0);
  const totalPages = Math.ceil(allStaff.length / VISIBLE_COUNT);
  const displayStaff = needsCarousel
    ? allStaff.slice(page * VISIBLE_COUNT, (page + 1) * VISIBLE_COUNT)
    : allStaff;

  return (
    <section id="equipo" className="py-24 overflow-hidden">
      <div className="section-container">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-16 gap-6">
          <div className="text-center md:text-left flex-1">
            <div className="flex items-center justify-center md:justify-start gap-2 text-gold font-bold text-xs uppercase tracking-widest mb-4">
              <Award size={14} />
              {title || 'Mentes Maestras'}
            </div>
            <h2 className="text-4xl md:text-5xl font-bold text-ink tracking-tightest leading-tight">
              {subtitle ? subtitle : (<>En manos de <span className="text-ink-3">los mejores.</span></>)}
            </h2>
          </div>
          {needsCarousel && (
            <div className="flex items-center gap-2 justify-center md:justify-end">
              <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}
                className="w-10 h-10 rounded-full border border-edge flex items-center justify-center hover:bg-ink hover:text-surface transition-all disabled:opacity-30 disabled:cursor-not-allowed">
                <ChevronLeft size={18} />
              </button>
              <span className="text-xs font-bold text-ink-3 min-w-[3ch] text-center">{page + 1}/{totalPages}</span>
              <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}
                className="w-10 h-10 rounded-full border border-edge flex items-center justify-center hover:bg-ink hover:text-surface transition-all disabled:opacity-30 disabled:cursor-not-allowed">
                <ChevronRight size={18} />
              </button>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-10">
          {displayStaff.map((member, i) => (
            <motion.div
              key={(member.name || '') + i + page}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.08, duration: 0.3 }}
              className="group relative"
            >
              <div className="relative aspect-[4/5] rounded-[2.5rem] overflow-hidden bg-raised mb-6 shadow-2xl shadow-black/5">
                <div className="absolute inset-0 bg-gradient-to-t from-ink/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                {member.image ? (
                  <img src={member.image} alt={member.name} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-raised to-edge/20 text-ink/10">
                    <User size={100} strokeWidth={1} />
                  </div>
                )}
              </div>
              <div className="text-center">
                <h3 className="text-xl font-bold text-ink tracking-tighter2 mb-1">{member.name}</h3>
                <p className="text-sm font-medium text-ink-3 uppercase tracking-wider">{member.specialty}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
