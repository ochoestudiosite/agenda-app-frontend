import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import * as LucideIcons from 'lucide-react';
import { Menu, X, Calendar, ArrowUpRight } from 'lucide-react';
import ThemeToggle from '../ui/ThemeToggle';

// Premium navbar: floats as a glass pill once the user scrolls past the
// hero. Keeps clearance from the page edges to feel boutique-grade and
// avoids the typical "sticky-from-start" SaaS heaviness.
export default function LandingNavbar({ businessName, config = {} }) {
  const showCta      = config.navbar?.show_cta !== false;
  const ctaText      = config.navbar?.cta_text || 'Reservar';
  const displayName  = config.navbar?.business_name || businessName || 'Cita24';
  const LogoIcon     = LucideIcons[config.navbar?.logo_icon] || Calendar;

  const [isScrolled, setIsScrolled]                 = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen]     = useState(false);

  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Lock background scroll while the mobile drawer is open.
  useEffect(() => {
    if (!isMobileMenuOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [isMobileMenuOpen]);

  const allLinks = [
    { name: 'Servicios',     href: '#servicios',     configKey: 'services_section' },
    { name: 'Equipo',        href: '#equipo',        configKey: 'staff_section' },
    { name: 'Testimoniales', href: '#testimoniales', configKey: 'testimonials_section' },
    { name: 'Ubicación',     href: '#ubicacion',     configKey: 'location_section' },
  ];
  const navLinks = allLinks.filter(l => config[l.configKey]?.visible !== false);

  return (
    <nav
      className={`fixed top-0 inset-x-0 z-50 transition-[padding] duration-500 ${
        isScrolled ? 'pt-3' : 'pt-5'
      }`}
    >
      <div className="section-container">
        <div
          className={`relative flex items-center justify-between gap-3 rounded-full transition-all duration-500 ${
            isScrolled
              ? 'h-14 px-4 sm:px-5 bg-card/70 backdrop-blur-xl border border-edge/40 shadow-[0_8px_30px_rgba(0,0,0,0.04)]'
              : 'h-16 px-2 sm:px-3 bg-transparent border border-transparent'
          }`}
        >
          {/* Brand */}
          <Link to="/" className="flex items-center gap-2.5 group shrink-0 pl-1">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gold text-on-gold flex items-center justify-center transition-transform group-hover:scale-[1.04] active:scale-95 overflow-hidden">
              {config.navbar?.logo_type === 'image' && config.navbar?.logo_url ? (
                <img src={config.navbar.logo_url} alt={displayName} className="w-full h-full object-contain p-1.5" />
              ) : (
                <LogoIcon size={16} strokeWidth={2.4} />
              )}
            </div>
            <span className="font-display text-[15px] sm:text-base font-semibold tracking-tight text-ink">
              {displayName}
            </span>
          </Link>

          {/* Center nav */}
          <div className="hidden md:flex items-center gap-1 absolute left-1/2 -translate-x-1/2">
            {navLinks.map((link) => (
              <a
                key={link.name}
                href={link.href}
                className="relative px-3 py-1.5 text-[13px] font-medium text-ink-2 hover:text-ink rounded-full transition-colors"
              >
                {link.name}
              </a>
            ))}
          </div>

          {/* Right side */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            <div className="hidden sm:block">
              <ThemeToggle />
            </div>

            {showCta && (
              <Link to="/agendar" className="hidden sm:inline-flex">
                <button className="group inline-flex items-center gap-1.5 bg-ink text-card pl-4 pr-3 h-9 rounded-full text-[13px] font-semibold hover:bg-gold hover:text-on-gold transition-all">
                  {ctaText}
                  <span className="w-5 h-5 rounded-full bg-card/15 group-hover:bg-on-gold/15 flex items-center justify-center transition-colors">
                    <ArrowUpRight size={11} strokeWidth={2.5} />
                  </span>
                </button>
              </Link>
            )}

            {/* Mobile CTA — compact gold pill */}
            {showCta && (
              <Link to="/agendar" className="sm:hidden">
                <button className="bg-gold text-on-gold h-9 px-4 rounded-full text-[12px] font-bold">
                  {ctaText}
                </button>
              </Link>
            )}

            {/* Mobile menu trigger */}
            <button
              aria-label={isMobileMenuOpen ? 'Cerrar menú' : 'Abrir menú'}
              className="md:hidden w-9 h-9 rounded-full text-ink hover:bg-ink/5 active:bg-ink/10 flex items-center justify-center transition-colors"
              onClick={() => setIsMobileMenuOpen(v => !v)}
            >
              {isMobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile drawer */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              className="md:hidden fixed inset-0 z-40 bg-ink/30 backdrop-blur-sm"
              onClick={() => setIsMobileMenuOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
              className="md:hidden absolute top-full left-0 right-0 z-50 p-4"
            >
              <div className="bg-card rounded-3xl p-6 flex flex-col gap-1 shadow-[0_24px_60px_rgba(0,0,0,0.15)] border border-edge/40">
                {navLinks.map((link, i) => (
                  <a
                    key={link.name}
                    href={link.href}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="flex items-center justify-between py-3 px-1 text-base font-medium text-ink border-b border-edge/30 last:border-0"
                  >
                    {link.name}
                    <ArrowUpRight size={16} className="text-ink-3" />
                  </a>
                ))}
                <div className="mt-2 pt-2 flex items-center justify-between gap-3">
                  <ThemeToggle />
                  {showCta && (
                    <Link to="/agendar" onClick={() => setIsMobileMenuOpen(false)} className="flex-1">
                      <button className="w-full bg-ink text-card py-3 rounded-full font-semibold text-sm">
                        {ctaText}
                      </button>
                    </Link>
                  )}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </nav>
  );
}
