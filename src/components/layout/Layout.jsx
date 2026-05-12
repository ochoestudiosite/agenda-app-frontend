import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTheme } from '../../context/ThemeContext';
import { useConfig } from '../../hooks/useConfig';
import { ToastProvider } from '../ui/Toast';
import TenantNotFound from '../../pages/TenantNotFound';
import ThemeToggle from '../ui/ThemeToggle';
import LandingContact from '../landing/LandingContact';

export default function Layout({ children }) {
  const { pathname }                        = useLocation();
  const { data: config, isLoading, error } = useConfig();

  // 404 = tenant slug doesn't exist
  // 403 = tenant exists but is suspended (is_active = false)
  // 400 = no tenant could be identified for this request (host malformed)
  if (error?.status === 404 || error?.status === 403 || error?.status === 400) {
    return <TenantNotFound suspended={error?.status === 403} />;
  }
  const bizName = config?.business_name;
  const logoUrl = config?.logo_url ?? null;

  let landingConfig = config?.landing || config?.landing_config || {};
  if (typeof landingConfig === 'string') {
    try { landingConfig = JSON.parse(landingConfig); } catch { landingConfig = {}; }
  }
  const footerBizName = landingConfig?.navbar?.business_name || bizName;

  const isHome = pathname === '/';

  if (isHome) {
    return (
      <ToastProvider>
        <main className="min-h-dvh flex flex-col bg-surface text-ink transition-colors duration-300">
          {children}
        </main>
      </ToastProvider>
    );
  }

  return (
    <ToastProvider>
      <div className="min-h-dvh bg-surface flex flex-col">

        {/* Nav */}
        <header className="sticky top-0 z-40 border-b border-edge/60 bg-surface/80 backdrop-blur-xl backdrop-saturate-150">
          <div className="max-w-3xl mx-auto px-5 h-14 flex items-center justify-between">

            <Link to="/" className="flex items-center gap-2.5 group">
              <BizLogo url={logoUrl} size="nav" />
              {isLoading
                ? <span className="h-4 w-28 skeleton rounded-md" />
                : <span className="font-display text-[1.0625rem] font-semibold tracking-tight text-ink">
                    {bizName || 'Cita24'}
                  </span>
              }
            </Link>

            <div className="flex items-center gap-1">
              <nav className="hidden sm:flex items-center">
                <NavLink to="/"          active={pathname === '/'}>Inicio</NavLink>
                <NavLink to="/agendar"   active={pathname.startsWith('/agendar')}>Agendar</NavLink>
                <NavLink to="/gestionar" active={pathname.startsWith('/gestionar')}>Mis Citas</NavLink>
              </nav>

              <nav className="flex sm:hidden items-center gap-0.5 mr-1">
                <MobileNavLink to="/agendar"   active={pathname.startsWith('/agendar')}>Agendar</MobileNavLink>
                <MobileNavLink to="/gestionar" active={pathname.startsWith('/gestionar')}>Mis Citas</MobileNavLink>
              </nav>

              <ThemeToggle className="ml-1" />
            </div>
          </div>
        </header>

        <main className="flex-1 w-full">
          {children}
        </main>

        <LandingContact
          businessName={footerBizName}
          socials={landingConfig?.contact_section}
          config={landingConfig}
          linkBase="/"
        />

      </div>
    </ToastProvider>
  );
}

function NavLink({ to, active, children }) {
  return (
    <Link
      to={to}
      className={`relative px-3.5 py-1.5 text-[0.8125rem] font-medium rounded-lg transition-all duration-160
        ${active ? 'text-ink' : 'text-ink-3 hover:text-ink-2 hover:bg-raised'}`}
    >
      {children}
      {active && (
        <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-4 h-0.5 bg-gold rounded-full" />
      )}
    </Link>
  );
}

function MobileNavLink({ to, active, children }) {
  return (
    <Link
      to={to}
      className={`px-2.5 py-1.5 text-xs font-medium rounded-lg transition-all duration-160
        ${active ? 'text-gold bg-gold/8' : 'text-ink-3 hover:text-ink-2'}`}
    >
      {children}
    </Link>
  );
}



function CalendarIcon({ className = 'w-3.5 h-3.5 text-on-gold' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path strokeLinecap="round" d="M16 2v4M8 2v4M3 10h18" />
    </svg>
  );
}

// Renders the business logo if logo_url is set and loads correctly, otherwise
// falls back to the CalendarIcon on its gold background.
// Only accepts https:// or data:image/ URLs — anything else is treated as absent.
function BizLogo({ url, size = 'nav' }) {
  const [failed, setFailed] = useState(false);
  const safe = url && !failed && (url.startsWith('https://') || url.startsWith('data:image/'));

  if (size === 'nav') {
    return safe ? (
      <span className="w-7 h-7 rounded-lg shrink-0 overflow-hidden bg-raised border border-edge/50">
        <img src={url} alt="" onError={() => setFailed(true)}
             className="w-full h-full object-cover" loading="lazy" />
      </span>
    ) : (
      <span className="w-7 h-7 rounded-lg bg-gold flex items-center justify-center shrink-0">
        <CalendarIcon />
      </span>
    );
  }

  return safe ? (
    <span className="w-5 h-5 rounded-md shrink-0 overflow-hidden bg-raised border border-edge/40">
      <img src={url} alt="" onError={() => setFailed(true)}
           className="w-full h-full object-cover" loading="lazy" />
    </span>
  ) : (
    <span className="w-5 h-5 rounded-md bg-gold/10 flex items-center justify-center">
      <CalendarIcon className="w-2.5 h-2.5 text-gold" />
    </span>
  );
}


