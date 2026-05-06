export default function TenantNotFound({ suspended = false }) {
  return (
    <div className="min-h-dvh bg-surface flex flex-col items-center justify-center px-6 py-16">

      {/* Cita24 wordmark */}
      <a href="https://cita24.com" className="flex items-center gap-2.5 mb-12 no-underline">
        <span className="w-8 h-8 rounded-xl bg-gold flex items-center justify-center shrink-0">
          <CalendarIcon />
        </span>
        <span className="font-display text-[1.125rem] font-bold tracking-tight text-ink">
          Cita<span className="text-gold">24</span>
        </span>
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
          className="flex-1 flex items-center justify-center gap-2 h-11 rounded-xl
                     bg-raised border border-edge text-ink-2 text-sm font-medium
                     hover:bg-edge/40 transition-colors duration-160"
        >
          <HomeIcon />
          Ir a Cita24
        </a>
        {!suspended && (
          <a
            href="https://cita24.com/registro"
            className="flex-1 flex items-center justify-center gap-2 h-11 rounded-xl
                       bg-gold text-on-gold text-sm font-semibold
                       hover:opacity-90 transition-opacity duration-160"
          >
            Registra tu negocio
            <ArrowRight />
          </a>
        )}
      </div>

      <p className="mt-10 text-xs text-ink-3 text-center">
        ¿Crees que es un error?{' '}
        <a href="mailto:hola@cita24.com" className="text-gold hover:underline">
          hola@cita24.com
        </a>
      </p>

    </div>
  );
}

function CalendarIcon() {
  return (
    <svg className="w-4 h-4 text-on-gold" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path strokeLinecap="round" d="M16 2v4M8 2v4M3 10h18" />
    </svg>
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
