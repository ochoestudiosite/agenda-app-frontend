import { useBooking } from '../../context/BookingContext';

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
            <div className="shrink-0 flex items-center justify-center w-14 h-14 rounded-xl bg-raised group-hover:bg-gold/8 transition-colors duration-240">
              <LocationIcon />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-[0.9375rem] text-ink group-hover:text-gold transition-colors duration-160 truncate">
                {branch.name}
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

function LocationIcon() {
  return (
    <svg className="w-5 h-5 text-ink-3 group-hover:text-gold transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
    </svg>
  );
}

function ChevronRight() {
  return (
    <svg className="w-4 h-4 text-ink-3 group-hover:text-gold transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
    </svg>
  );
}
