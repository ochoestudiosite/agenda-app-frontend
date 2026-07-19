import { useEffect, useId, useRef, useState } from 'react';
import { toTitleCase } from '../../utils/formatters';

// Chip + popover reutilizable de "requisitos previos" — se usa en cada fila/
// tarjeta de servicio que trae `requirements` (texto libre) y/o `prerequisite`
// (otro servicio del catálogo que debe tomarse antes). Vive dentro de
// contenedores con su propio onClick (seleccionar servicio, etc.), por eso
// detiene la propagación en todos sus clicks internos.
export default function RequirementsTag({ requirements, prerequisite, serviceName }) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);
  const popoverId = useId();

  useEffect(() => {
    if (!open) return;
    function handlePointerDown(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    }
    function handleKeyDown(e) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  if (!requirements && !prerequisite) return null;

  const requirementLines = (requirements || '')
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean);

  function handleToggle(e) {
    e.stopPropagation();
    setOpen(o => !o);
  }

  return (
    <div ref={wrapRef} className="relative inline-flex" onClick={e => e.stopPropagation()}>
      <button
        type="button"
        onClick={handleToggle}
        aria-expanded={open}
        aria-controls={popoverId}
        className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full
                   bg-amber-500/10 text-amber-700 dark:text-amber-400 hover:bg-amber-500/15
                   transition-colors cursor-pointer"
      >
        <svg className="w-3 h-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
        </svg>
        Requisitos previos
      </button>

      {open && (
        <div
          id={popoverId}
          role="dialog"
          aria-label={serviceName ? `Indicaciones previas de ${toTitleCase(serviceName)}` : 'Indicaciones previas'}
          className="absolute z-20 top-full left-0 mt-2 w-72 max-w-[90vw] rounded-2xl border border-amber-500/25
                     bg-card shadow-deep p-4 text-xs leading-relaxed animate-fade-up"
        >
          {requirementLines.length > 0 && (
            <ul className="space-y-2">
              {requirementLines.map((line, i) => (
                <li key={i} className="flex items-start gap-2 text-ink-2">
                  <svg className="w-3.5 h-3.5 mt-0.5 shrink-0 text-gold" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>{line}</span>
                </li>
              ))}
            </ul>
          )}
          {prerequisite && (
            <p className={`text-ink-2 ${requirementLines.length > 0 ? 'mt-2.5' : ''}`}>
              Requiere haber tomado: {toTitleCase(prerequisite.name)}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
