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
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id="requirements-modal-title" className="font-display text-lg font-semibold text-ink tracking-tight">
              Antes de reservar
            </h2>
            <p className="text-sm text-gold font-semibold mt-0.5">{toTitleCase(service.name)}</p>
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

        {service.requirements && (
          <p className="mt-4 text-sm text-ink-2 leading-relaxed whitespace-pre-line">
            {service.requirements}
          </p>
        )}

        {prerequisite && (
          <div className="mt-4 rounded-2xl border border-amber-500/25 bg-amber-500/8 p-4">
            <p className="text-sm text-ink font-medium">
              Este servicio requiere haber tomado:{' '}
              <span className="font-semibold text-amber-700 dark:text-amber-400">{toTitleCase(prerequisite.name)}</span>
            </p>
            {prerequisite.bookable && (
              <p className="mt-1 text-xs text-amber-700 dark:text-amber-400">Puedes reservarlo en línea</p>
            )}
          </div>
        )}

        <div className="mt-6 flex flex-col gap-2">
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
