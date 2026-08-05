import { useState, useEffect, useLayoutEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  Menu, X, Calendar, ArrowUpRight,
  Scissors, Coffee, Heart, Star, Smile, Crown, Anchor, Gem, Zap, Gift,
  ShieldCheck, Clock, Mail, MapPin, Phone, Sparkles, Briefcase,
} from 'lucide-react';
import ThemeToggle from '../ui/ThemeToggle';

// Únicos íconos configurables desde admin-app/src/pages/LandingEditor.jsx (ICON_OPTIONS).
const ICON_MAP = {
  Calendar, Scissors, Coffee, Heart, Star, Smile, Crown, Anchor, Gem, Zap, Gift,
  ShieldCheck, Clock, Mail, MapPin, Phone, Sparkles, Briefcase,
};

// Distancia del borde superior de una sección al viewport a partir de la cual
// se marca como "activa" en el navbar — altura de la barra (60px) + margen.
// Mismo patrón que cita24-landing/src/components/Navbar.jsx.
const TRIGGER_OFFSET = 72;

// Ventana en la que se ignora el scroll-spy tras un click en el navbar, para
// que el indicador no salte por secciones intermedias durante el smooth-scroll.
const CLICK_LOCK_MS = 800;

// Two distinct treatments that share the same design DNA as cita24-landing/Navbar:
//   - Desktop (md+): full-width fixed bar that gains glass blur on scroll
//   - Mobile  (<md): same bar + animated drawer below
// All content is tenant-configurable via the `config` prop; the admin's
// Landing Editor previews changes live over postMessage.
export default function LandingNavbar({ businessName, config = {}, overPhoto = false }) {
  const showCta     = config.navbar?.show_cta !== false;
  const ctaText     = config.navbar?.cta_text || 'Reservar';
  const displayName = config.navbar?.business_name || businessName || 'Cita24';
  const LogoIcon    = ICON_MAP[config.navbar?.logo_icon] || Calendar;

  // Show uploaded business logo unless admin explicitly picked 'icon' type.
  const logoUrl  = config.navbar?.logo_url || null;
  const useImage = config.navbar?.logo_type === 'icon' ? false : !!logoUrl;

  const [isScrolled, setIsScrolled]       = useState(false);
  const [isMobileMenuOpen, setMobileMenu] = useState(false);

  // drawerMounted/drawerVisible replace the previous framer-motion
  // AnimatePresence: the drawer stays mounted for the duration of its own
  // exit transition (200ms, matching the panel below) instead of being
  // removed from the DOM the instant the user taps the hamburger again.
  const [drawerMounted, setDrawerMounted] = useState(false);
  const [drawerVisible, setDrawerVisible] = useState(false);

  // Resalta la sección visible + pill deslizante detrás del link activo,
  // mismo mecanismo que cita24-landing/src/components/Navbar.jsx.
  const [activeSection, setActiveSection] = useState('');
  const [bar, setBar]         = useState({ x: 0, width: 0, visible: false, sliding: false });
  const navLinksRef           = useRef(null);
  const linkRefs              = useRef([]);
  const scrollLockRef         = useRef(false);

  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 16);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Barra transparente flotando sobre la foto de fondo del hero: usar texto
  // blanco (independiente de light/dark mode) hasta que el scroll active el
  // fondo sólido, momento en el que vuelve a los colores normales de --ink.
  const lightNav = overPhoto && !isScrolled;

  useEffect(() => {
    if (!isMobileMenuOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [isMobileMenuOpen]);

  useEffect(() => {
    let raf, timer;
    if (isMobileMenuOpen) {
      setDrawerMounted(true);
      raf = requestAnimationFrame(() => setDrawerVisible(true));
    } else {
      setDrawerVisible(false);
      timer = setTimeout(() => setDrawerMounted(false), 200);
    }
    return () => {
      if (raf) cancelAnimationFrame(raf);
      if (timer) clearTimeout(timer);
    };
  }, [isMobileMenuOpen]);

  // defaultVisible must mirror each section's own render condition in Home.jsx —
  // testimonials is opt-in (hidden until the admin explicitly enables it, since
  // an empty config would otherwise show generic placeholder reviews), while
  // the rest are opt-out (shown unless explicitly hidden).
  const allLinks = [
    { name: 'Servicios',     href: '#servicios',     configKey: 'services_section',     defaultVisible: true },
    { name: 'Equipo',        href: '#equipo',        configKey: 'staff_section',        defaultVisible: true },
    { name: 'Testimoniales', href: '#testimoniales', configKey: 'testimonials_section', defaultVisible: false },
    { name: 'Ubicación',     href: '#ubicacion',     configKey: 'location_section',     defaultVisible: true },
    { name: 'Preguntas',     href: '#faq',           configKey: 'faq_section',          defaultVisible: false },
  ];
  const navLinks = allLinks.filter(l => {
    const v = config[l.configKey]?.visible;
    return v == null ? l.defaultVisible : v === true;
  });
  const navKey = navLinks.map(l => l.href).join('|');

  // Scroll-spy: recorre navLinks en orden y se queda con la última sección
  // cuyo borde superior ya cruzó TRIGGER_OFFSET (funciona igual con Home.jsx
  // montando todas las secciones de una vez).
  useEffect(() => {
    const spy = () => {
      if (scrollLockRef.current) return;
      if (window.scrollY < 80) { setActiveSection(''); return; }
      let found = '';
      for (const link of navLinks) {
        const el = document.getElementById(link.href.slice(1));
        if (el && el.getBoundingClientRect().top <= TRIGGER_OFFSET) found = link.href.slice(1);
      }
      setActiveSection(found);
    };
    window.addEventListener('scroll', spy, { passive: true });
    spy();
    return () => window.removeEventListener('scroll', spy);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navKey]);

  // Posiciona la pill deslizante bajo el link activo. useLayoutEffect corre
  // antes del paint para que no haya parpadeo.
  useLayoutEffect(() => {
    const idx = navLinks.findIndex(l => l.href.slice(1) === activeSection);
    if (idx < 0 || !navLinksRef.current || !linkRefs.current[idx]) {
      setBar(b => ({ ...b, visible: false, sliding: false }));
      return;
    }
    const containerRect = navLinksRef.current.getBoundingClientRect();
    const elRect         = linkRefs.current[idx].getBoundingClientRect();
    const x     = Math.round(elRect.left - containerRect.left);
    const width = Math.round(elRect.width);
    setBar(b => ({ x, width, visible: true, sliding: b.visible }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSection]);

  const handleLinkClick = (sectionId) => {
    setActiveSection(sectionId);
    scrollLockRef.current = true;
    setTimeout(() => { scrollLockRef.current = false; }, CLICK_LOCK_MS);
  };

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
      <span className={`font-display text-[1.0625rem] font-bold tracking-tight leading-none transition-colors duration-300 ${lightNav ? 'text-white' : 'text-ink'}`}>
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
          <div ref={navLinksRef} className="hidden md:flex items-center gap-1 absolute left-1/2 -translate-x-1/2">
            {/* Pill deslizante detrás del link activo — jumps to position on
                first appearance (sliding=false), then slides between links. */}
            <span
              aria-hidden="true"
              className="absolute top-1/2 h-8 rounded-lg pointer-events-none"
              style={{
                left: bar.x,
                width: bar.width,
                transform: 'translateY(-50%)',
                background: 'rgb(var(--gold) / 0.12)',
                opacity: bar.visible ? 1 : 0,
                transition: bar.sliding
                  ? 'left 0.32s cubic-bezier(0.23,1,0.32,1), width 0.32s cubic-bezier(0.23,1,0.32,1), opacity 0.2s ease'
                  : 'opacity 0.2s ease',
              }}
            />
            {navLinks.map((link, i) => {
              const sectionId = link.href.slice(1);
              const isActive  = activeSection === sectionId;
              return (
                <a
                  key={link.name}
                  ref={el => { linkRefs.current[i] = el; }}
                  href={link.href}
                  onClick={() => handleLinkClick(sectionId)}
                  className={`relative px-3 py-1.5 text-[14px] rounded-lg transition-colors ${
                    lightNav
                      ? 'text-white/85 hover:text-white hover:bg-white/10 font-medium'
                      : isActive
                        ? 'text-gold font-semibold'
                        : 'text-ink-2 hover:text-ink hover:bg-raised font-medium'
                  }`}
                >
                  {link.name}
                </a>
              );
            })}
          </div>

          {/* Right side — desktop */}
          <div className="hidden md:flex items-center gap-2 shrink-0 ml-auto">
            <ThemeToggle className={lightNav ? '!text-white/80 hover:!text-white hover:!bg-white/10' : ''} />
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
            className={`md:hidden ml-auto w-[34px] h-[34px] rounded-xl border flex items-center justify-center transition-colors ${
              lightNav ? 'border-white/30 text-white hover:bg-white/10' : 'border-edge/50 text-ink-2 hover:bg-raised hover:text-ink'
            }`}
            onClick={() => setMobileMenu(v => !v)}
            aria-label={isMobileMenuOpen ? 'Cerrar menú' : 'Abrir menú'}
          >
            {isMobileMenuOpen ? <X size={17} /> : <Menu size={17} />}
          </button>
        </div>
      </nav>

      {/* ── Mobile drawer ── */}
      {drawerMounted && (
          <>
            <div
              className={`md:hidden fixed inset-0 top-[60px] z-40 bg-ink/30 backdrop-blur-sm
                          transition-opacity duration-[180ms] ${drawerVisible ? 'opacity-100' : 'opacity-0'}`}
              onClick={() => setMobileMenu(false)}
            />
            <div
              className={`md:hidden fixed top-[60px] inset-x-0 z-50 px-4 pt-3 pb-4
                          transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)]
                          ${drawerVisible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'}`}
            >
              <div
                className="rounded-3xl p-5 flex flex-col gap-1 border border-edge/40"
                style={{ background: 'rgb(var(--card))', boxShadow: '0 24px 60px rgba(0,0,0,0.18)' }}
              >
                {navLinks.map(link => {
                  const sectionId = link.href.slice(1);
                  const isActive  = activeSection === sectionId;
                  return (
                    <a
                      key={link.name}
                      href={link.href}
                      onClick={() => { setMobileMenu(false); handleLinkClick(sectionId); }}
                      className={`flex items-center justify-between py-3 px-1 text-base border-b border-edge/30 last:border-0 ${
                        isActive ? 'text-gold font-semibold' : 'text-ink font-medium'
                      }`}
                    >
                      {link.name}
                      {isActive
                        ? <span className="w-1.5 h-1.5 rounded-full bg-gold shrink-0" />
                        : <ArrowUpRight size={16} className="text-ink-3" />}
                    </a>
                  );
                })}
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
            </div>
          </>
      )}
    </>
  );
}
