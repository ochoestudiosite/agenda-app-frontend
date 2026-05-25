import { Fragment } from 'react';
import { useBooking } from '../../context/BookingContext';
import { isGroupMode } from '../../context/BookingContext';
import { useConfig } from '../../hooks/useConfig';
import { toTitleCase, formatTime, formatCombinedPrice } from '../../utils/formatters';

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

export default function BookingSummary() {
  const { state }        = useBooking();
  const { data: config } = useConfig();
  const timeFmt          = config?.time_format ?? '12h';

  const items = [];

  if (state.branch) {
    items.push({
      id:      'branch',
      category: 'sucursal',
      avatars: [{ src: state.branch.image_url || null, initials: nameInitials(state.branch.name) }],
      label:   toTitleCase(state.branch.name),
      sub:     null,
    });
  }

  const selectedServices = state.services ?? [];
  if (selectedServices.length > 0) {
    const totalDuration = selectedServices.reduce((sum, s) => sum + (s.duration || 0), 0);
    items.push({
      id:      'service',
      category: selectedServices.length > 1 ? 'servicios' : 'servicio',
      avatars: selectedServices.map(s => ({ src: s.imageUrl || null, initials: nameInitials(s.name) })),
      label:   selectedServices.map(s => toTitleCase(s.name)).join(' + '),
      sub:     `${totalDuration} min · ${formatCombinedPrice(selectedServices)}`,
    });
  }

  const groupMode = isGroupMode(state);
  if (groupMode) {
    const assignments = state.serviceAssignments ?? [];
    if (assignments.length > 0) {
      items.push({
        id:      'specialists',
        category: 'especialistas',
        avatars: assignments.map(a => ({
          src:      a.specialist.avatarUrl || null,
          initials: a.specialist.initials || nameInitials(a.specialist.name),
        })),
        label:   assignments.map(a => toTitleCase(a.specialist.name)).join(', '),
        sub:     `${assignments.length} de ${state.services.length}`,
      });
    }
  } else if (state.specialist) {
    items.push({
      id:      'specialist',
      category: 'especialista',
      avatars: [{
        src:      state.specialist.avatarUrl || null,
        initials: state.specialist.initials || nameInitials(state.specialist.name),
      }],
      label:   toTitleCase(state.specialist.name),
      sub:     state.specialist.specialty || null,
    });
  }

  if (state.date && state.time) {
    items.push({
      id:       'datetime',
      category: 'horario',
      icon:     <CalendarIcon />,
      label:    shortDate(state.date),
      sub:      formatTime(state.time, timeFmt),
    });
  }

  if (items.length === 0) return null;

  return (
    <div className="mb-8 animate-fade-in" role="status" aria-label="Resumen de tu selección">
      <div className="relative bg-card border border-edge/60 rounded-2xl shadow-xs overflow-hidden border-l-4 border-l-gold">
        <div className="flex items-stretch overflow-x-auto scrollbar-hide">
          {items.map((item, i) => (
            <Fragment key={item.id}>
              <SummaryItem item={item} />
              {i < items.length - 1 && (
                <div className="self-stretch flex items-center shrink-0 py-3" aria-hidden>
                  <div className="w-px h-full bg-edge/40" />
                </div>
              )}
            </Fragment>
          ))}
        </div>
      </div>
    </div>
  );
}

// Stacked circular avatars — up to 3 visible, then "+N" overflow bubble
function AvatarStack({ avatars }) {
  const show  = avatars.slice(0, 3);
  const extra = avatars.length - 3;
  const multi = avatars.length > 1;

  return (
    <div className="flex items-center shrink-0" style={{ paddingRight: multi ? '4px' : '0' }}>
      {show.map((a, i) => (
        <div
          key={i}
          className="w-8 h-8 rounded-full border-2 border-card overflow-hidden
                     bg-gold/10 flex items-center justify-center"
          style={{ marginLeft: i > 0 ? '-8px' : '0', zIndex: show.length - i, position: 'relative' }}
        >
          {a.src ? (
            <img src={a.src} alt="" className="w-full h-full object-cover" />
          ) : (
            <span className="text-[9px] font-bold text-gold leading-none select-none">{a.initials}</span>
          )}
        </div>
      ))}
      {extra > 0 && (
        <div
          className="w-8 h-8 rounded-full border-2 border-card bg-raised flex items-center justify-center"
          style={{ marginLeft: '-8px', zIndex: 0, position: 'relative' }}
        >
          <span className="text-[9px] font-bold text-ink-3 leading-none">+{extra}</span>
        </div>
      )}
    </div>
  );
}

function SummaryItem({ item }) {
  return (
    <div className="flex items-center gap-3 px-4 py-3 shrink-0">
      {item.avatars ? (
        <AvatarStack avatars={item.avatars} />
      ) : (
        <div className="w-8 h-8 rounded-full bg-gold/10 border border-gold/20 flex items-center justify-center shrink-0 text-gold">
          {item.icon}
        </div>
      )}

      <div>
        <p className="text-[9.5px] font-bold uppercase tracking-[0.08em] text-gold/70 leading-none mb-1">
          {item.category}
        </p>
        <p className="text-[12.5px] font-semibold text-ink leading-snug whitespace-nowrap">
          {item.label}
        </p>
        {item.sub && (
          <p className="text-[10.5px] text-ink-3 leading-none mt-0.5 whitespace-nowrap">
            {item.sub}
          </p>
        )}
      </div>
    </div>
  );
}

function CalendarIcon() {
  return (
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path strokeLinecap="round" d="M16 2v4M8 2v4M3 10h18" />
    </svg>
  );
}
