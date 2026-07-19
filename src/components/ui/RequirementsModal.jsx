import { useEffect, useRef } from 'react';
import { toTitleCase } from '../../utils/formatters';

// Modal de "requisitos previos" — se muestra al intentar agregar un servicio
// marcado con `requirements` (texto informativo) y/o `prerequisite` (otro
// servicio del catálogo que debe tomarse antes). Ver ServiceSelector.jsx.
//
// canBookPrerequisite: false cuando ya se alcanzó el máximo de 5 servicios
// seleccionados — en ese caso el botón "Reservar X primero" se oculta porque
// el TOGGLE_SERVICE resultante sería un no-op silencioso.
export default function RequirementsModal({
  service,
  prerequisiteAlreadySelected = false,
  canBookPrerequisite = true,
  onContinue,
  onBookPrerequisite,
  onClose,
}) {
  const primaryBtnRef = useRef(null);
  const previousFocusRef = useRef(null);

  const prerequisite = service?.prerequisite ?? null;
  const showBookPrerequisite = Boolean(
    prerequisite && prerequisite.bookable && !prerequisiteAlreadySelected && canBookPrerequisite
  );
  // Indicaciones como checklist en vez de un párrafo crudo — cada línea que
  // el negocio escribió en su textarea se vuelve un item con su propio ícono,
  // más fácil de escanear que un bloque de texto.
  const requirementLines = (service?.requirements || '')
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean);

  useEffect(() => {
    previousFocusRef.current = document.activeElement;
    primaryBtnRef.current?.focus();

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    function handleKeyDown(e) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = prevOverflow;
      document.removeEventListener('keydown', handleKeyDown);
      previousFocusRef.current?.focus?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!service) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/40 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="requirements-modal-title"
        onClick={e => e.stopPropagation()}
        className="w-full max-w-md rounded-3xl border border-edge bg-card shadow-deep p-6 animate-fade-up"
      >
        <div className="flex items-start gap-3.5">
          <div className="shrink-0 w-11 h-11 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-600 dark:text-amber-400" aria-hidden="true">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
          </div>
          <div className="min-w-0 flex-1 pt-0.5">
            <h2 id="requirements-modal-title" className="leading-snug">
              <span className="block text-[11px] font-bold uppercase tracking-[0.14em] text-ink-3">Antes de reservar</span>
              <span className="block mt-0.5 font-display text-xl font-semibold text-ink tracking-tight truncate">
                {toTitleCase(service.name)}
              </span>
            </h2>
          </div>
          <button
            onClick={onClose}
            aria-label="Cerrar"
            className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-ink-3 hover:text-ink hover:bg-raised transition-colors cursor-pointer"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {requirementLines.length > 0 && (
          <div className="mt-5 rounded-2xl bg-raised/70 border border-edge/50 p-4">
            <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-ink-3 mb-2.5">Indicaciones</p>
            <ul className="space-y-2">
              {requirementLines.map((line, i) => (
                <li key={i} className="flex items-start gap-2.5 text-sm text-ink-2 leading-relaxed">
                  <svg className="w-4 h-4 mt-0.5 shrink-0 text-gold" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>{line}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {prerequisite && (
          <div className={`${requirementLines.length > 0 ? 'mt-3' : 'mt-5'} rounded-2xl border border-amber-500/25 bg-amber-500/8 p-4`}>
            <div className="flex items-start gap-2.5">
              <svg className="w-4 h-4 mt-0.5 shrink-0 text-amber-600 dark:text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="min-w-0">
                <p className="text-sm text-ink font-medium leading-relaxed">
                  Este servicio requiere haber tomado:{' '}
                  <span className="font-semibold text-amber-700 dark:text-amber-400">{toTitleCase(prerequisite.name)}</span>
                </p>
                {prerequisite.bookable && (
                  <p className="mt-1 text-xs text-amber-700 dark:text-amber-400">Puedes reservarlo en línea</p>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="mt-6 flex flex-col gap-2.5">
          {showBookPrerequisite ? (
            <>
              <button
                ref={primaryBtnRef}
                onClick={onBookPrerequisite}
                className="w-full py-3 rounded-xl bg-gold text-on-gold font-semibold text-sm tracking-wide
                           hover:bg-gold/90 active:scale-[0.98] transition-all duration-160 cursor-pointer
                           focus:outline-none focus:ring-2 focus:ring-gold/30"
              >
                Reservar {toTitleCase(prerequisite.name)} primero
              </button>
              <button
                onClick={onContinue}
                className="w-full py-3 rounded-xl border border-edge text-ink font-semibold text-sm tracking-wide
                           hover:bg-raised active:scale-[0.98] transition-all duration-160 cursor-pointer
                           focus:outline-none focus:ring-2 focus:ring-gold/30"
              >
                Ya cumplo el requisito — continuar
              </button>
            </>
          ) : (
            <button
              ref={primaryBtnRef}
              onClick={onContinue}
              className="w-full py-3 rounded-xl bg-gold text-on-gold font-semibold text-sm tracking-wide
                         hover:bg-gold/90 active:scale-[0.98] transition-all duration-160 cursor-pointer
                         focus:outline-none focus:ring-2 focus:ring-gold/30"
            >
              Entendido, continuar
            </button>
          )}
          <button
            onClick={onClose}
            className="w-full py-2.5 text-sm font-medium text-ink-3 hover:text-ink transition-colors cursor-pointer"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}
