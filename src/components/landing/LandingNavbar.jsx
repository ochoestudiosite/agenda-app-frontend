import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import * as LucideIcons from 'lucide-react';
import { Menu, X, Calendar, ArrowUpRight } from 'lucide-react';
import ThemeToggle from '../ui/ThemeToggle';

// Two distinct treatments that share the same design DNA as cita24-landing/Navbar:
//   - Desktop (md+): full-width fixed bar that gains glass blur on scroll
//   - Mobile  (<md): same bar + animated drawer below
// All content is tenant-configurable via the `config` prop; the admin's
// Landing Editor previews changes live over postMessage.
export default function LandingNavbar({ businessName, config = {} }) {
  const showCta     = config.navbar?.show_cta !== false;
  const ctaText     = config.navbar?.cta_text || 'Reservar';
  const displayName = config.navbar?.business_name || businessName || 'Cita24';
  const LogoIcon    = LucideIcons[config.navbar?.logo_icon] || Calendar;

  // Show uploaded business logo unless admin explicitly picked 'icon' type.
  const logoUrl  = config.navbar?.logo_url || null;
  const useImage = config.navbar?.logo_type === 'icon' ? false : !!logoUrl;

  const [isScrolled, setIsScrolled]       = useState(false);
  const [isMobileMenuOpen, setMobileMenu] = useState(false);

  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 16);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

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

  const handleLogoClick = () => {
    setMobileMenu(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    // No pushState manual — React Router's Link to="/" limpia el hash
    // automáticamente. El pushState creaba una entrada extra en el historial.
  };

  const LogoEl = (
    <Link to="/" onClick={handleLogoClick} className="flex items-center gap-2.5 shrink-0 group">
      {useImage ? (
        <img
          src={logoUrl}
          alt={displayName}
          className="h-[30px] w-auto max-w-[110px] object-contain transition-transform duration-150 group-hover:scale-[1.04] active:scale-95"
        />
      ) : (
        <span
          className="w-[30px] h-[30px] rounded-lg shrink-0 flex items-center justify-center transition-transform duration-150 group-hover:scale-[1.04] active:scale-95"
          style={{
            background: 'linear-gradient(135deg, rgb(var(--gold-light)), rgb(var(--gold)))',
            color: 'rgb(var(--on-gold))',
          }}
        >
          <LogoIcon size={15} strokeWidth={2.4} />
        </span>
      )}
      <span className="font-display text-[1.0625rem] font-bold tracking-tight text-ink leading-none">
        {displayName}
      </span>
    </Link>
  );

  return (
    <>
      {/* ── Navbar ── */}
      <nav
        className={`fixed top-0 inset-x-0 z-50 h-[60px] transition-all duration-300 ${
          isScrolled
            ? 'bg-card/80 backdrop-blur-xl backdrop-saturate-200 border-b border-edge/50'
            : 'bg-transparent border-b border-transparent'
        }`}
      >
        <div className="section-container h-full flex items-center justify-between gap-4">
          {LogoEl}

          {/* Center links — desktop only */}
          <div className="hidden md:flex items-center gap-1 absolute left-1/2 -translate-x-1/2">
            {navLinks.map(link => (
              <a
                key={link.name}
                href={link.href}
                className="px-3 py-1.5 text-[13.5px] font-medium text-ink-2 hover:text-ink hover:bg-raised rounded-lg transition-colors"
              >
                {link.name}
              </a>
            ))}
          </div>

          {/* Right side — desktop */}
          <div className="hidden md:flex items-center gap-2 shrink-0 ml-auto">
            <ThemeToggle />
            {showCta && (
              <Link to="/agendar">
                <button
                  className="inline-flex items-center gap-1.5 h-9 pl-4 pr-3 rounded-full text-[13px] font-bold transition-all hover:opacity-90 active:scale-[0.97]"
                  style={{
                    background: 'linear-gradient(135deg, rgb(var(--gold-light)), rgb(var(--gold)))',
                    color: 'rgb(var(--on-gold))',
                    boxShadow: '0 1px 8px rgb(var(--gold) / 0.28)',
                  }}
                >
                  {ctaText}
                  <ArrowUpRight size={13} strokeWidth={2.5} />
                </button>
              </Link>
            )}
          </div>

          {/* Hamburger — mobile only */}
          <button
            className="md:hidden ml-auto w-[34px] h-[34px] rounded-xl border border-edge/50 flex items-center justify-center text-ink-2 hover:bg-raised hover:text-ink transition-colors"
            onClick={() => setMobileMenu(v => !v)}
            aria-label={isMobileMenuOpen ? 'Cerrar menú' : 'Abrir menú'}
          >
            {isMobileMenuOpen ? <X size={17} /> : <Menu size={17} />}
          </button>
        </div>
      </nav>

      {/* ── Mobile drawer ── */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              className="md:hidden fixed inset-0 top-[60px] z-40 bg-ink/30 backdrop-blur-sm"
              onClick={() => setMobileMenu(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="md:hidden fixed top-[60px] inset-x-0 z-50 px-4 pt-3 pb-4"
            >
              <div
                className="rounded-3xl p-5 flex flex-col gap-1 border border-edge/40"
                style={{ background: 'rgb(var(--card))', boxShadow: '0 24px 60px rgba(0,0,0,0.18)' }}
              >
                {navLinks.map(link => (
                  <a
                    key={link.name}
                    href={link.href}
                    onClick={() => setMobileMenu(false)}
                    className="flex items-center justify-between py-3 px-1 text-base font-medium text-ink border-b border-edge/30 last:border-0"
                  >
                    {link.name}
                    <ArrowUpRight size={16} className="text-ink-3" />
                  </a>
                ))}
                <div className="mt-3 pt-3 border-t border-edge/30 flex items-center gap-3">
                  <ThemeToggle />
                  {showCta && (
                    <Link to="/agendar" onClick={() => setMobileMenu(false)} className="flex-1">
                      <button
                        className="w-full inline-flex items-center justify-center gap-1.5 h-11 rounded-full font-bold text-sm"
                        style={{
                          background: 'linear-gradient(135deg, rgb(var(--gold-light)), rgb(var(--gold)))',
                          color: 'rgb(var(--on-gold))',
                        }}
                      >
                        {ctaText}
                        <ArrowUpRight size={14} strokeWidth={2.4} />
                      </button>
                    </Link>
                  )}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
