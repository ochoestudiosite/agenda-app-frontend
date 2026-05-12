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
  const { state } = useBooking();
  const { data: config } = useConfig();
  const timeFmt = config?.time_format ?? '12h';

  const pills = [];

  if (state.branch) {
    pills.push({
      id: 'branch',
      icon: <PinIcon />,
      label: toTitleCase(state.branch.name),
      sub: null,
    });
  }

  if (state.service) {
    pills.push({
      id: 'service',
      icon: <ScissorsIcon />,
      label: toTitleCase(state.service.name),
      sub: `${state.service.duration} min · ${formatPrice(state.service.price)}`,
    });
  }

  if (state.specialist) {
    pills.push({
      id: 'specialist',
      icon: <SpecialistAvatar specialist={state.specialist} />,
      label: toTitleCase(state.specialist.name),
      sub: state.specialist.specialty || null,
    });
  }

  if (state.date && state.time) {
    pills.push({
      id: 'datetime',
      icon: <CalendarIcon />,
      label: shortDate(state.date),
      sub: formatTime(state.time, timeFmt),
    });
  }

  if (pills.length === 0) return null;

  return (
    <div className="mb-8 animate-fade-in">
      {/* Gradient fade hint on right edge for mobile scroll */}
      <div className="relative">
        <div
          className="flex items-center gap-2 overflow-x-auto pb-1 -mx-4 px-4"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {pills.map((pill, i) => (
            <div key={pill.id} className="flex items-center gap-2 shrink-0">
              <Pill pill={pill} delay={i * 70} />
              {i < pills.length - 1 && (
                <svg
                  className="w-3 h-3 text-ink-3/30 shrink-0"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2.5}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              )}
            </div>
          ))}
          {/* spacer so last pill clears the right gradient */}
          <div className="shrink-0 w-4" aria-hidden />
        </div>
        {/* Right fade gradient */}
        <div
          className="absolute right-0 top-0 bottom-0 w-10 pointer-events-none"
          style={{ background: 'linear-gradient(to right, transparent, var(--color-surface, #fff))' }}
          aria-hidden
        />
      </div>
    </div>
  );
}

function Pill({ pill, delay }) {
  return (
    <div
      className="flex items-center gap-2.5 pl-2 pr-3.5 py-2 bg-card border border-edge rounded-xl
                 shadow-[0_1px_3px_0_rgb(0,0,0,0.04)] hover:border-gold/40 hover:shadow-[0_2px_8px_0_rgb(0,0,0,0.07)]
                 transition-all duration-200 animate-fade-up"
      style={{ animationDelay: `${delay}ms`, animationFillMode: 'both' }}
    >
      <div className="w-7 h-7 rounded-lg bg-gold/10 flex items-center justify-center shrink-0 text-gold overflow-hidden">
        {pill.icon}
      </div>
      <div className="min-w-0">
        <p className="text-[12px] font-semibold text-ink leading-snug truncate max-w-[110px]">
          {pill.label}
        </p>
        {pill.sub && (
          <p className="text-[10px] text-ink-3 leading-none mt-0.5 truncate max-w-[110px]">
            {pill.sub}
          </p>
        )}
      </div>
    </div>
  );
}

function SpecialistAvatar({ specialist }) {
  if (specialist?.avatarUrl) {
    return (
      <img
        src={specialist.avatarUrl}
        alt={specialist.name}
        className="w-full h-full object-cover rounded-lg"
      />
    );
  }
  return (
    <span className="text-[10px] font-bold leading-none">
      {specialist?.initials || '?'}
    </span>
  );
}

function ScissorsIcon() {
  return (
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <circle cx="6" cy="6" r="3" />
      <circle cx="6" cy="18" r="3" />
      <path strokeLinecap="round" d="M20 4L8.12 15.88M14.47 14.48L20 20M8.12 8.12L12 12" />
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
