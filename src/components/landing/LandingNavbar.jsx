import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import * as LucideIcons from 'lucide-react';
import { Menu, X, Calendar, ArrowUpRight } from 'lucide-react';
import ThemeToggle from '../ui/ThemeToggle';

// Two distinct treatments:
//   - Desktop (md+): floating glass pill that compacts on scroll. Premium feel.
//   - Mobile  (<md): solid topbar matching the admin-app shell — clean, dense,
//     anchored to the edge of the viewport. The previous floating pill was
//     cramped on phones with logo + CTA + hamburger competing for space.
export default function LandingNavbar({ businessName, config = {} }) {
  const showCta     = config.navbar?.show_cta !== false;
  const ctaText     = config.navbar?.cta_text || 'Reservar';
  const displayName = config.navbar?.business_name || businessName || 'Cita24';
  const LogoIcon    = LucideIcons[config.navbar?.logo_icon] || Calendar;

  // Show the uploaded business logo unless the admin has *explicitly* chosen
  // 'icon' as the type. This makes a logo uploaded from either Configuración
  // (writes business_settings.logo_url) or Landing Editor (writes the same
  // column via the server-side identity router) appear immediately, instead
  // of requiring the admin to also toggle navbar.logo_type to 'image'.
  const logoUrl  = config.navbar?.logo_url || null;
  const useImage = config.navbar?.logo_type === 'icon' ? false : !!logoUrl;

  const [isScrolled, setIsScrolled]             = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 24);
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

  // Visual treatment mirrors Layout.jsx BizLogo so /agendar and / look like
  // they belong to the same brand: rounded square, gold container when
  // showing the icon, neutral raised container with a hairline border when
  // showing an image, object-cover for crisp aspect-fill.
  const Logo = (
    <Link to="/" className="flex items-center gap-2.5 group shrink-0">
      <span
        className={`w-9 h-9 rounded-xl shrink-0 overflow-hidden flex items-center justify-center transition-transform group-hover:scale-[1.04] active:scale-95 ${
          useImage
            ? 'bg-raised border border-edge/50'
            : 'bg-gold text-on-gold'
        }`}
      >
        {useImage ? (
          <img src={logoUrl} alt={displayName} className="w-full h-full object-cover" />
        ) : (
          <LogoIcon size={16} strokeWidth={2.4} />
        )}
      </span>
      <span className="font-display text-[15px] sm:text-base font-semibold tracking-tight text-ink truncate">
        {displayName}
      </span>
    </Link>
  );

  return (
    <>
      {/* ── Mobile topbar: solid, full-width, matches admin-app pattern ──────── */}
      <header
        className={`md:hidden fixed top-0 inset-x-0 z-50 h-14 flex items-center gap-3 px-4 bg-card transition-shadow ${
          isScrolled ? 'border-b border-edge/60 shadow-[0_1px_0_0_rgba(0,0,0,0.04)]' : 'border-b border-transparent'
        }`}
      >
        {Logo}

        <div className="flex-1" />

        <button
          aria-label={isMobileMenuOpen ? 'Cerrar menú' : 'Abrir menú'}
          className="w-9 h-9 -mr-1 rounded-xl text-ink-2 hover:bg-surface flex items-center justify-center transition-colors"
          onClick={() => setIsMobileMenuOpen(v => !v)}
        >
          {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </header>

      {/* ── Desktop floating pill ───────────────────────────────────────────── */}
      <nav className={`hidden md:block fixed top-0 inset-x-0 z-50 transition-[padding] duration-500 ${isScrolled ? 'pt-3' : 'pt-5'}`}>
        <div className="section-container">
          <div
            className={`relative flex items-center justify-between gap-3 rounded-full transition-all duration-500 ${
              isScrolled
                ? 'h-14 px-5 bg-card/70 backdrop-blur-xl border border-edge/40 shadow-[0_8px_30px_rgba(0,0,0,0.04)]'
                : 'h-16 px-3 bg-transparent border border-transparent'
            }`}
          >
            {Logo}

            {/* Center nav */}
            <div className="flex items-center gap-1 absolute left-1/2 -translate-x-1/2">
              {navLinks.map((link) => (
                <a
                  key={link.name}
                  href={link.href}
                  className="px-3 py-1.5 text-[13px] font-medium text-ink-2 hover:text-ink rounded-full transition-colors"
                >
                  {link.name}
                </a>
              ))}
            </div>

            {/* Right side */}
            <div className="flex items-center gap-2">
              <ThemeToggle />
              {showCta && (
                <Link to="/agendar">
                  <button className="group inline-flex items-center gap-1.5 bg-ink text-card pl-4 pr-3 h-9 rounded-full text-[13px] font-semibold hover:bg-gold hover:text-on-gold transition-all">
                    {ctaText}
                    <span className="w-5 h-5 rounded-full bg-card/15 group-hover:bg-on-gold/15 flex items-center justify-center transition-colors">
                      <ArrowUpRight size={11} strokeWidth={2.5} />
                    </span>
                  </button>
                </Link>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* ── Mobile drawer ──────────────────────────────────────────────────── */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              className="md:hidden fixed inset-0 top-14 z-40 bg-ink/30 backdrop-blur-sm"
              onClick={() => setIsMobileMenuOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
              className="md:hidden fixed top-14 inset-x-0 z-50 px-4 pt-3 pb-4"
            >
              <div className="bg-card rounded-3xl p-5 flex flex-col gap-1 shadow-[0_24px_60px_rgba(0,0,0,0.18)] border border-edge/40">
                {navLinks.map((link) => (
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
                <div className="mt-3 pt-3 border-t border-edge/30 flex items-center gap-3">
                  <ThemeToggle />
                  {showCta && (
                    <Link
                      to="/agendar"
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="flex-1"
                    >
                      <button className="w-full inline-flex items-center justify-center gap-1.5 bg-ink text-card h-11 rounded-full font-semibold text-sm">
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
