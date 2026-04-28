import { Link, useLocation } from 'react-router-dom';
import { useTheme } from '../../context/ThemeContext';
import { ToastProvider } from '../ui/Toast';

export default function Layout({ children }) {
  const { pathname } = useLocation();

  return (
    <ToastProvider>
      <div className="min-h-dvh bg-surface flex flex-col">
        <header className="border-b border-edge sticky top-0 z-40 bg-surface/90 backdrop-blur-md">
          <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
            <Link to="/" className="font-display text-xl font-semibold tracking-wide text-gold">
              BarberPro
            </Link>
            <div className="flex items-center gap-1">
              <nav className="flex items-center gap-1 mr-2">
                <NavLink to="/"          active={pathname === '/'}>Inicio</NavLink>
                <NavLink to="/agendar"   active={pathname === '/agendar'}>Agendar</NavLink>
                <NavLink to="/gestionar" active={pathname === '/gestionar'}>Mis Citas</NavLink>
              </nav>
              <ThemeToggle />
            </div>
          </div>
        </header>

        <main className="flex-1">
          {children}
        </main>

        <footer className="border-t border-edge py-8 text-center">
          <p className="text-ink-3 text-sm">
            © {new Date().getFullYear()} BarberPro — Todos los derechos reservados
          </p>
        </footer>
      </div>
    </ToastProvider>
  );
}

function NavLink({ to, active, children }) {
  return (
    <Link
      to={to}
      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors duration-150
        ${active
          ? 'text-gold bg-gold/10'
          : 'text-ink-2 hover:text-ink hover:bg-raised'
        }`}
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
      className="w-11 h-11 flex items-center justify-center rounded-xl border border-edge
                 text-ink-2 hover:text-gold hover:border-gold/40 hover:bg-gold/5
                 transition-all duration-150 cursor-pointer"
    >
      {isDark ? <SunIcon /> : <MoonIcon />}
    </button>
  );
}

function SunIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <circle cx="12" cy="12" r="4" />
      <path strokeLinecap="round" d="M12 2v2M12 20v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M2 12h2M20 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
    </svg>
  );
}
