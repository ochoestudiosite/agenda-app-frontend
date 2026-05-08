import { motion } from 'framer-motion';
import { User, Award, Instagram, Twitter } from 'lucide-react';

export default function LandingStaff({ staff = [], title, subtitle }) {
  const displayStaff = staff.length > 0 ? staff : [
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
              key={member.name + i}
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

                {/* Social Overlay */}
                <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-3 translate-y-10 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-500">
                  <div className="w-10 h-10 rounded-full glass flex items-center justify-center text-white hover:bg-gold transition-colors cursor-pointer">
                    <Instagram size={18} />
                  </div>
                  <div className="w-10 h-10 rounded-full glass flex items-center justify-center text-white hover:bg-gold transition-colors cursor-pointer">
                    <Twitter size={18} />
                  </div>
                </div>
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
