import { useBooking } from '../../context/BookingContext';
import { toTitleCase } from '../../utils/formatters';

export default function BranchSelector({ branches }) {
  const { dispatch } = useBooking();

  function select(branch) {
    dispatch({ type: 'SET_BRANCH', payload: branch });
  }

  return (
    <div className="animate-fade-up">
      <div className="mb-7">
        <h2 className="font-display text-2xl font-semibold text-ink tracking-tight">Elige tu sucursal</h2>
        <p className="text-ink-3 text-sm mt-1">¿En cuál ubicación deseas tu cita?</p>
      </div>
      <div className="space-y-2.5">
        {branches.map((branch, i) => (
          <button
            key={branch.id}
            onClick={() => select(branch)}
            className="w-full text-left group flex items-center gap-4 p-5 rounded-2xl border border-edge bg-card
                       hover:border-gold/40 hover:shadow-card active:scale-[0.99]
                       transition-all duration-240 cursor-pointer animate-fade-up"
            style={{ animationDelay: `${i * 40}ms`, animationFillMode: 'both' }}
          >
            <div className="shrink-0 w-14 h-14 rounded-xl overflow-hidden flex items-center justify-center bg-raised group-hover:bg-gold/8 transition-colors duration-240">
              {branch.image_url
                ? <img src={branch.image_url} alt={branch.name} className="w-full h-full object-cover" />
                : <BranchInitials name={branch.name} />
              }
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-[0.9375rem] text-ink group-hover:text-gold transition-colors duration-160 truncate">
                {toTitleCase(branch.name)}
              </p>
              {branch.address && (
                <p className="text-xs text-ink-3 mt-0.5 leading-snug line-clamp-2">{branch.address}</p>
              )}
              {branch.phone && (
                <p className="text-xs text-ink-3 mt-0.5">{branch.phone}</p>
              )}
            </div>
            <ChevronRight />
          </button>
        ))}
      </div>
    </div>
  );
}

function BranchInitials({ name }) {
  const initials = name
    ? name.trim().split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase()
    : '?';
  return (
    <span className="text-[1.125rem] font-bold text-gold/80 select-none">{initials}</span>
  );
}

function ChevronRight() {
  return (
    <svg className="w-4 h-4 text-ink-3 group-hover:text-gold transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
    </svg>
  );
}
