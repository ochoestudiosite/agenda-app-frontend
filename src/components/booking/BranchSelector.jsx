import { MapPin, Phone, ChevronRight } from 'lucide-react';
import { useBooking } from '../../context/BookingContext';
import { toTitleCase } from '../../utils/formatters';
import ExpandableText from '../ui/ExpandableText';

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
          <div
            key={branch.id}
            role="button"
            tabIndex={0}
            onClick={() => select(branch)}
            onKeyDown={e => {
              if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); select(branch); }
            }}
            className="w-full text-left group flex items-center gap-4 p-5 rounded-2xl border border-edge bg-card
                       hover:border-gold/40 hover:shadow-card active:scale-[0.99]
                       transition-all duration-240 cursor-pointer animate-fade-up
                       focus:outline-none focus:ring-2 focus:ring-gold/30"
            style={{ animationDelay: `${i * 40}ms`, animationFillMode: 'both' }}
          >
            <div className="relative shrink-0 w-14 h-14 rounded-full overflow-hidden flex items-center justify-center
                            bg-raised border-2 border-edge group-hover:border-gold/50 transition-all duration-240">
              <BranchInitials name={branch.name} />
              {branch.image_url && (
                <img
                  src={branch.image_url}
                  alt={branch.name}
                  className="absolute inset-0 w-full h-full object-cover"
                  style={{ opacity: 0, transition: 'opacity 200ms ease' }}
                  onLoad={e  => { e.currentTarget.style.opacity = '1'; }}
                  onError={e => { e.currentTarget.style.display = 'none'; }}
                />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-[0.9375rem] text-ink group-hover:text-gold transition-colors duration-160 leading-snug">
                {toTitleCase(branch.name)}
              </p>
              {branch.address && (
                <div className="flex items-start gap-1.5 mt-1">
                  <MapPin className="w-3.5 h-3.5 text-ink-3 shrink-0 mt-px" />
                  <div className="min-w-0 flex-1">
                    <ExpandableText text={branch.address} className="text-xs text-ink-3 leading-snug" />
                  </div>
                </div>
              )}
              {branch.phone && (
                <div className="flex items-center gap-1.5 mt-0.5">
                  <Phone className="w-3.5 h-3.5 text-ink-3 shrink-0" />
                  <p className="text-xs text-ink-3">{branch.phone}</p>
                </div>
              )}
            </div>
            <ChevronRight className="w-4 h-4 text-ink-3 group-hover:text-gold transition-colors" />
          </div>
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
