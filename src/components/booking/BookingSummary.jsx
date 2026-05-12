import { Fragment } from 'react';
import { useBooking } from '../../context/BookingContext';
import { useConfig } from '../../hooks/useConfig';
import { toTitleCase, formatPrice, formatTime } from '../../utils/formatters';

function shortDate(dateStr) {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('es-MX', {
    weekday: 'short', day: 'numeric', month: 'short',
  });
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
      icon:    <PinIcon />,
      label:   toTitleCase(state.branch.name),
      sub:     null,
    });
  }

  if (state.service) {
    items.push({
      id:       'service',
      category: 'servicio',
      icon:     <ScissorsIcon />,
      label:    toTitleCase(state.service.name),
      sub:      `${state.service.duration} min · ${formatPrice(state.service.price)}`,
    });
  }

  if (state.specialist) {
    items.push({
      id:        'specialist',
      category:  'especialista',
      isAvatar:  true,
      avatarUrl: state.specialist.avatarUrl,
      initials:  state.specialist.initials,
      label:     toTitleCase(state.specialist.name),
      sub:       state.specialist.specialty || null,
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

        {/* Scrollable items */}
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

function SummaryItem({ item }) {
  return (
    <div className="flex items-center gap-3 px-4 py-3 shrink-0">
      {/* Icon / Avatar bubble */}
      <div className="w-8 h-8 rounded-lg bg-gold/10 border border-gold/20 flex items-center justify-center shrink-0 text-gold overflow-hidden">
        {item.isAvatar ? (
          item.avatarUrl
            ? <img src={item.avatarUrl} alt="" className="w-full h-full object-cover" />
            : <span className="text-[9px] font-bold leading-none">{item.initials || '?'}</span>
        ) : (
          item.icon
        )}
      </div>

      {/* Text */}
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

function ScissorsIcon() {
  return (
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <circle cx="6" cy="6" r="3" />
      <circle cx="6" cy="18" r="3" />
      <line x1="20" y1="4" x2="8.12" y2="15.88" />
      <line x1="14.47" y1="14.48" x2="20" y2="20" />
      <line x1="8.12" y1="8.12" x2="12" y2="12" />
    </svg>
  );
}

function PinIcon() {
  return (
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round"
        d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
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
