import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { toTitleCase } from '../../utils/formatters';

// Margen mínimo respecto al borde de la pantalla y separación del chip.
const EDGE_PADDING = 12;
const TRIGGER_GAP  = 8;

// Chip + popover reutilizable de "requisitos previos" — se usa en cada fila/
// tarjeta de servicio que trae `requirements` (texto libre) y/o `prerequisite`
// (otro servicio del catálogo que debe tomarse antes). Vive dentro de
// contenedores con su propio onClick (seleccionar servicio, etc.), por eso
// detiene la propagación en todos sus clicks internos.
//
// El popover se porta a document.body con position:fixed y coordenadas
// calculadas en JS: varias de las tarjetas donde vive este chip (AppointmentCard,
// GroupAppointmentCard) tienen overflow-hidden, y un chip cerca del borde
// derecho de la pantalla desbordaría un popover posicionado con absolute —
// el portal escapa cualquier overflow-hidden/scroll ancestro y el clamp de
// abajo garantiza que nunca se salga del viewport, sin importar dónde caiga
// el chip.
export default function RequirementsTag({ requirements, prerequisite, serviceName }) {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState(null); // {top, left} en coordenadas de viewport
  const wrapRef    = useRef(null); // botón/chip disparador
  const popoverRef = useRef(null); // contenido porteado
  const popoverId  = useId();

  // Mide el chip y el popover ya montado (oculto hasta tener coords) y calcula
  // una posición que siempre cabe en pantalla: pega a la derecha si se
  // desbordaría a la derecha, y voltea arriba del chip si no cabe abajo.
  useLayoutEffect(() => {
    if (!open) { setCoords(null); return; }
    function reposition() {
      const trigger = wrapRef.current;
      const popover = popoverRef.current;
      if (!trigger || !popover) return;
      const triggerRect = trigger.getBoundingClientRect();
      const popoverRect = popover.getBoundingClientRect();
      const vw = window.innerWidth;
      const vh = window.innerHeight;

      let left = triggerRect.left;
      if (left + popoverRect.width > vw - EDGE_PADDING) left = vw - EDGE_PADDING - popoverRect.width;
      if (left < EDGE_PADDING) left = EDGE_PADDING;

      let top = triggerRect.bottom + TRIGGER_GAP;
      if (top + popoverRect.height > vh - EDGE_PADDING) {
        const above = triggerRect.top - popoverRect.height - TRIGGER_GAP;
        top = above >= EDGE_PADDING ? above : EDGE_PADDING;
      }

      setCoords({ top, left });
    }
    reposition();
    window.addEventListener('resize', reposition);
    return () => window.removeEventListener('resize', reposition);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function handlePointerDown(e) {
      const insideTrigger = wrapRef.current?.contains(e.target);
      const insidePopover = popoverRef.current?.contains(e.target);
      if (!insideTrigger && !insidePopover) setOpen(false);
    }
    function handleKeyDown(e) {
      if (e.key === 'Escape') setOpen(false);
    }
    // Cierra en vez de re-posicionar durante scroll — más simple y evita que
    // el popover "persiga" al chip con jank mientras el usuario navega.
    function handleScroll() {
      setOpen(false);
    }
    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    window.addEventListener('scroll', handleScroll, true);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('scroll', handleScroll, true);
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

      {open && createPortal(
        <div
          ref={popoverRef}
          id={popoverId}
          role="dialog"
          aria-label={serviceName ? `Indicaciones previas de ${toTitleCase(serviceName)}` : 'Indicaciones previas'}
          onClick={e => e.stopPropagation()}
          style={{
            position:   'fixed',
            top:        coords?.top ?? 0,
            left:       coords?.left ?? 0,
            visibility: coords ? 'visible' : 'hidden',
          }}
          className="z-[60] w-72 max-w-[calc(100vw-24px)] rounded-2xl border border-amber-500/25
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
        </div>,
        document.body,
      )}
    </div>
  );
}
