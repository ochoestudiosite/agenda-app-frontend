import { motion } from 'framer-motion';
import { User, Award } from 'lucide-react';

export default function LandingStaff({ staff = [], customStaff, useCustom, title, subtitle }) {
  // If useCustom AND customStaff exist, show those; otherwise show DB staff
  const displayStaff = (useCustom && customStaff?.length > 0)
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

  return (
    <section id="equipo" className="py-24 overflow-hidden">
      <div className="section-container">
        <div className="text-center mb-16">
          <div className="flex items-center justify-center gap-2 text-gold font-bold text-xs uppercase tracking-widest mb-4">
            <Award size={14} />
            {title || 'Mentes Maestras'}
          </div>
          <h2 className="text-4xl md:text-5xl font-bold text-ink tracking-tightest leading-tight">
            {subtitle ? (
              subtitle
            ) : (
              <>En manos de <span className="text-ink-3">los mejores.</span></>
            )}
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-10">
          {displayStaff.map((member, i) => (
            <motion.div
              key={(member.name || '') + i}
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.15 }}
              className="group relative"
            >
              {/* Image Container */}
              <div className="relative aspect-[4/5] rounded-[2.5rem] overflow-hidden bg-raised mb-6 shadow-2xl shadow-black/5">
                <div className="absolute inset-0 bg-gradient-to-t from-ink/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                
                {member.image ? (
                  <img 
                    src={member.image} 
                    alt={member.name} 
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-raised to-edge/20 text-ink/10">
                    <User size={120} strokeWidth={1} />
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="text-center">
                <h3 className="text-2xl font-bold text-ink tracking-tighter2 mb-1">
                  {member.name}
                </h3>
                <p className="text-sm font-medium text-ink-3 uppercase tracking-wider">
                  {member.specialty}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
