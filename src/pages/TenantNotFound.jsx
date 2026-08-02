import Logo from '../components/Logo';

export default function TenantNotFound({ suspended = false }) {
  return (
    <div className="min-h-dvh bg-surface flex flex-col items-center justify-center px-6 py-16">

      {/* Cita24 wordmark — this page has no tenant context, always show the
          real Cita24 brand (not the neutral gray tenant-branding fallback). */}
      <a href="https://cita24.com" className="flex items-center mb-12 no-underline">
        <Logo variant="green" height={24} />
      </a>

      {/* Giant status number */}
      <p className="font-display font-extrabold text-ink/[0.06] leading-none select-none"
         style={{ fontSize: 'clamp(96px, 20vw, 160px)' }}>
        {suspended ? '403' : '404'}
      </p>

      {/* Icon */}
      <div className="w-16 h-16 rounded-2xl bg-raised border border-edge flex items-center justify-center mb-6 -mt-4">
        {suspended ? <LockIcon /> : <GhostIcon />}
      </div>

      <h1 className="font-display text-xl font-semibold text-ink text-center mb-3 tracking-tight">
        {suspended
          ? 'Negocio temporalmente suspendido'
          : 'Este negocio ya no está en Cita24'}
      </h1>

      <p className="text-ink-3 text-sm text-center max-w-[320px] leading-relaxed mb-10">
        {suspended
          ? 'Esta cuenta ha sido suspendida. Si eres el dueño, contacta a soporte para más información.'
          : 'La página que buscas fue eliminada o nunca existió. Puede que la URL esté mal escrita.'}
      </p>

      <div className="flex flex-col sm:flex-row gap-3 w-full max-w-xs">
        <a
          href="https://cita24.com"
          className="flex-1 flex items-center justify-center gap-2 px-5 py-3 rounded-xl
                     border border-edge bg-raised text-ink-2 text-sm font-semibold
                     hover:bg-edge/40 transition-colors duration-150"
        >
          <HomeIcon />
          Ir a Cita24
        </a>
        {!suspended && (
          <a
            href="https://cita24.com/registro"
            className="flex-1 flex items-center justify-center gap-2 px-5 py-3 rounded-xl
                       border border-transparent text-on-gold text-sm font-semibold
                       hover:opacity-90 transition-opacity duration-150"
            style={{ background: '#00C853' }}
          >
            Registra tu negocio
            <ArrowRight />
          </a>
        )}
      </div>

      <p className="mt-10 text-xs text-ink-3 text-center">
        ¿Crees que es un error?{' '}
        <a href="mailto:soporte@cita24.com" className="hover:underline" style={{ color: '#00C853' }}>
          soporte@cita24.com
        </a>
      </p>

    </div>
  );
}


function GhostIcon() {
  return (
    <svg className="w-7 h-7 text-ink-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 10h.01M15 10h.01M12 2a8 8 0 0 0-8 8v12l3-3 2.5 2.5L12 19l2.5 2.5L17 19l3 3V10a8 8 0 0 0-8-8z" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg className="w-7 h-7 text-ink-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

function HomeIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  );
}

function ArrowRight() {
  return (
    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round">
      <path d="M5 12h14M12 5l7 7-7 7" />
    </svg>
  );
}
