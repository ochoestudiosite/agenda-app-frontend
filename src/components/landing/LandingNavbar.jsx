import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import * as LucideIcons from 'lucide-react';
import { Menu, X, Calendar } from 'lucide-react';
import ThemeToggle from '../ui/ThemeToggle';

export default function LandingNavbar({ businessName, config = {} }) {
  const showCta = config.navbar?.show_cta !== false;
  const ctaText = config.navbar?.cta_text || 'Agendar ahora';
  const displayName = config.navbar?.business_name || businessName || 'Cita24';
  const LogoIcon = LucideIcons[config.navbar?.logo_icon] || Calendar;

  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const allLinks = [
    { name: 'Servicios',     href: '#servicios',     configKey: 'services_section' },
    { name: 'Equipo',        href: '#equipo',         configKey: 'staff_section' },
    { name: 'Testimoniales', href: '#testimoniales',  configKey: 'testimonials_section' },
    { name: 'Ubicación',     href: '#ubicacion',      configKey: 'location_section' },
  ];
  const navLinks = allLinks.filter(l => config[l.configKey]?.visible !== false);

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${isScrolled ? 'py-2' : 'py-4'}`}>
      <div className="section-container">
        <div className={`relative flex items-center justify-between px-5 py-2.5 rounded-2xl transition-all duration-500 ${
          isScrolled ? 'glass shadow-lg shadow-black/5 backdrop-blur-xl' : 'bg-transparent'
        }`}>
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2.5 group shrink-0">
            <div className="w-9 h-9 rounded-xl bg-ink flex items-center justify-center text-surface transition-transform group-hover:scale-105 active:scale-95 overflow-hidden">
              {config.navbar?.logo_type === 'image' && config.navbar?.logo_url ? (
                <img src={config.navbar.logo_url} alt="Logo" className="w-full h-full object-contain p-1.5" />
              ) : (
                <LogoIcon size={18} strokeWidth={2.5} />
              )}
            </div>
            <span className="font-display text-lg font-bold tracking-tight text-ink">
              {displayName}
            </span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-6">
            {navLinks.map((link) => (
              <a 
                key={link.name} 
                href={link.href}
                className="text-[13px] font-semibold text-ink/60 hover:text-ink transition-colors"
              >
                {link.name}
              </a>
            ))}
          </div>

          {/* Desktop Actions */}
          <div className="hidden md:flex items-center gap-3">
            <ThemeToggle />
            {showCta && (
              <Link to="/agendar">
                <button className="bg-ink text-surface px-5 py-2 rounded-xl text-[13px] font-bold hover:scale-[1.02] active:scale-[0.98] transition-all shadow-sm">
                  {ctaText}
                </button>
              </Link>
            )}
          </div>

          {/* Mobile Actions */}
          <div className="flex md:hidden items-center gap-2">
            <ThemeToggle />
            <button 
              className="p-2 text-ink rounded-lg hover:bg-ink/5 transition-colors"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              {isMobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="absolute top-full left-0 right-0 p-4 md:hidden"
          >
            <div className="glass rounded-2xl p-6 flex flex-col gap-4 shadow-2xl backdrop-blur-xl border border-edge/30">
              {navLinks.map((link) => (
                <a 
                  key={link.name} 
                  href={link.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="text-base font-semibold text-ink py-1"
                >
                  {link.name}
                </a>
              ))}
              {showCta && (
                <>
                  <div className="h-px bg-edge/30" />
                  <Link to="/agendar" onClick={() => setIsMobileMenuOpen(false)}>
                    <button className="w-full bg-ink text-surface py-3 rounded-xl font-bold text-sm">
                      {ctaText}
                    </button>
                  </Link>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
