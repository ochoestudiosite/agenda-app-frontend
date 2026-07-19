import { useEffect, useRef, useState } from 'react';
import { useBooking, isGroupMode } from '../../context/BookingContext';
import { useConfig } from '../../hooks/useConfig';
import { toTitleCase, formatTime, formatCombinedPrice, formatPrice, promoSavings } from '../../utils/formatters';
import SummaryStrip from '../ui/SummaryStrip';

function shortDate(dateStr) {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('es-MX', {
    weekday: 'short', day: 'numeric', month: 'short',
  });
}

function nameInitials(name) {
  return (name || '').trim().split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase() || '?';
}

// Aviso compacto de indicaciones previas — colapsado por defecto. El cliente
// ya las leyó una vez en el modal al agregar el servicio (RequirementsModal);
// esto es solo un recordatorio a demanda mientras avanza por el flujo, no un
// aviso forzado — por eso vive en un popover en vez de una caja siempre abierta
// que se repetiría en cada paso (sucursal → servicio → especialista → horario → datos).
function RequirementsNotice({ services }) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);

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

  if (!services.length) return null;

  return (
    <div ref={wrapRef} className="relative -mt-4 mb-6 inline-flex animate-fade-in">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
        aria-controls="requirements-popover"
        className="flex items-center gap-1.5 pl-2.5 pr-2 py-1.5 rounded-full bg-amber-500/8 border border-amber-500/25
                   text-amber-700 dark:text-amber-400 text-xs font-semibold hover:bg-amber-500/15
                   transition-colors duration-160 cursor-pointer focus:outline-none focus:ring-2 focus:ring-amber-500/30"
      >
        <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
        </svg>
        Indicaciones previas
        <svg className={`w-3 h-3 shrink-0 transition-transform duration-160 ${open ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div
          id="requirements-popover"
          role="dialog"
          aria-label="Indicaciones previas de tus servicios"
          className="absolute z-20 top-full left-0 mt-2 w-72 max-w-[90vw] rounded-2xl border border-amber-500/25
                     bg-card shadow-deep p-4 text-xs leading-relaxed text-amber-700 dark:text-amber-400
                     space-y-2.5 animate-fade-up"
        >
          {services.map(s => (
            <div key={s.id}>
              <p className="font-semibold">{toTitleCase(s.name)}</p>
              {s.requirements && <p className="whitespace-pre-line mt-0.5">{s.requirements}</p>}
              {s.prerequisite && <p className="mt-0.5">Requiere haber tomado: {toTitleCase(s.prerequisite.name)}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function BookingSummary() {
  const { state }        = useBooking();
  const { data: config } = useConfig();
  const timeFmt          = config?.time_format ?? '12h';

  const items = [];

  if (state.branch) {
    items.push({
      id:       'branch',
      category: 'sucursal',
      avatars:  [{ src: state.branch.image_url || null, initials: nameInitials(state.branch.name) }],
      label:    toTitleCase(state.branch.name),
      sub:      null,
    });
  }

  const selectedServices = state.services ?? [];
  if (selectedServices.length > 0) {
    const totalDuration = selectedServices.reduce((sum, s) => sum + (s.duration || 0), 0);
    const savings = promoSavings(selectedServices);
    const first = toTitleCase(selectedServices[0].name);
    items.push({
      id:       'service',
      category: selectedServices.length > 1 ? 'servicios' : 'servicio',
      avatars:  selectedServices.map(s => ({ src: s.imageUrl || null, initials: nameInitials(s.name) })),
      label:    selectedServices.length === 1
        ? first
        : `${first} +${selectedServices.length - 1} más`,
      sub:      `${totalDuration} min · ${formatCombinedPrice(selectedServices)}${savings > 0 ? ` · Ahorras ${formatPrice(savings)}` : ''}`,
    });
  }

  const groupMode = isGroupMode(state);
  if (groupMode) {
    const assignments = state.serviceAssignments ?? [];
    if (assignments.length > 0) {
      const first = toTitleCase(assignments[0].specialist.name);
      items.push({
        id:       'specialists',
        category: 'especialistas',
        avatars:  assignments.map(a => ({
          src:      a.specialist.avatarUrl || null,
          initials: a.specialist.initials || nameInitials(a.specialist.name),
        })),
        label:    assignments.length === 1
          ? first
          : `${first} y ${assignments.length - 1} más`,
        sub:      `${assignments.length} de ${state.services.length}`,
      });
    }
  } else if (state.specialist) {
    items.push({
      id:       'specialist',
      category: 'especialista',
      avatars:  [{
        src:      state.specialist.avatarUrl || null,
        initials: state.specialist.initials || nameInitials(state.specialist.name),
      }],
      label:    toTitleCase(state.specialist.name),
      sub:      state.specialist.specialty || null,
    });
  }

  if (state.date && state.time) {
    items.push({
      id:       'datetime',
      category: 'horario',
      label:    shortDate(state.date),
      sub:      formatTime(state.time, timeFmt),
    });
  }

  // Servicios seleccionados con indicaciones y/o prerequisito — se listan
  // aparte para que el cliente los vea antes de continuar con su reserva.
  const flaggedServices = selectedServices.filter(s => s.requirements || s.prerequisite);

  return (
    <>
      <SummaryStrip items={items} ariaLabel="Resumen de tu selección" />
      <RequirementsNotice services={flaggedServices} />
    </>
  );
}
