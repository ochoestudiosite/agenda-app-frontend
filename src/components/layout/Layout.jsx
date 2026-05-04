import { Link, useLocation } from 'react-router-dom';
import { useTheme } from '../../context/ThemeContext';
import { useConfig } from '../../hooks/useConfig';
import { ToastProvider } from '../ui/Toast';

export default function Layout({ children }) {
  const { pathname }              = useLocation();
  const { data: config, isLoading } = useConfig();
  const bizName = config?.business_name;

  return (
    <ToastProvider>
      <div className="min-h-dvh bg-surface flex flex-col">

        {/* Nav */}
        <header className="sticky top-0 z-40 border-b border-edge/60 bg-surface/80 backdrop-blur-xl backdrop-saturate-150">
          <div className="max-w-3xl mx-auto px-5 h-14 flex items-center justify-between">

            <Link to="/" className="flex items-center gap-2.5 group">
              <span className="w-7 h-7 rounded-lg bg-gold flex items-center justify-center shrink-0">
                <ScissorsIcon />
              </span>
              {isLoading
                ? <span className="h-4 w-28 skeleton rounded-md" />
                : <span className="font-display text-[1.0625rem] font-semibold tracking-tight text-ink">
                    {bizName || 'BarberPro'}
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

              <ThemeToggle />
            </div>
          </div>
        </header>

        <main className="flex-1 w-full">
          {children}
        </main>

        <footer className="border-t border-edge/60 py-8 safe-area-bottom">
          <div className="max-w-3xl mx-auto px-5 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-md bg-gold/10 flex items-center justify-center">
                <ScissorsIcon className="w-2.5 h-2.5 text-gold" />
              </span>
              {isLoading
                ? <span className="h-3 w-20 skeleton rounded-md" />
                : <span className="text-xs font-medium text-ink-3">{bizName || 'BarberPro'}</span>
              }
            </div>
            <p className="text-xs text-ink-3">
              © {new Date().getFullYear()} {bizName || 'BarberPro'} · Todos los derechos reservados
            </p>
          </div>
        </footer>

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

function ThemeToggle() {
  const { isDark, toggle } = useTheme();
  return (
    <button
      onClick={toggle}
      aria-label={isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
      className="w-9 h-9 flex items-center justify-center rounded-lg text-ink-3
                 hover:text-ink-2 hover:bg-raised transition-all duration-160 cursor-pointer ml-1"
    >
      {isDark ? <SunIcon /> : <MoonIcon />}
    </button>
  );
}

function ScissorsIcon({ className = 'w-3.5 h-3.5 text-on-gold' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <circle cx="6" cy="6" r="3" /><circle cx="6" cy="18" r="3" />
      <path strokeLinecap="round" d="M20 4L8.12 15.88M14.47 14.48L20 20M8.12 8.12L12 12" />
    </svg>
  );
}
function SunIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <circle cx="12" cy="12" r="4" />
      <path strokeLinecap="round" d="M12 2v2M12 20v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M2 12h2M20 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
    </svg>
  );
}
function MoonIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
    </svg>
  );
}
