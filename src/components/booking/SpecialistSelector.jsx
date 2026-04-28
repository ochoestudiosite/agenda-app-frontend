import { useServices } from '../../hooks/useServices';
import { useBooking } from '../../context/BookingContext';
import Spinner from '../ui/Spinner';

export default function SpecialistSelector() {
  const { data, isLoading } = useServices();
  const { state, dispatch } = useBooking();

  if (isLoading) return <div className="flex justify-center py-16"><Spinner size="lg" /></div>;

  return (
    <div className="animate-slide-up">
      <BackButton onClick={() => dispatch({ type: 'GO_BACK' })} />
      <h2 className="font-display text-2xl font-semibold mb-1 text-ink">Elige tu barbero</h2>
      <p className="text-ink-2 text-sm mb-6">
        Servicio: <span className="text-gold font-medium">{state.service?.name}</span>
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {data.specialists.map(specialist => (
          <SpecialistCard
            key={specialist.id}
            specialist={specialist}
            onSelect={() => dispatch({ type: 'SET_SPECIALIST', payload: specialist })}
          />
        ))}
      </div>
    </div>
  );
}

function SpecialistCard({ specialist, onSelect }) {
  return (
    <button
      onClick={onSelect}
      className="card p-5 flex flex-col items-center gap-3 hover:border-gold/50 hover:bg-raised transition-all duration-200 group active:scale-[0.99] cursor-pointer"
    >
      <div className="w-16 h-16 rounded-full bg-raised border-2 border-edge group-hover:border-gold/60 flex items-center justify-center transition-all duration-200">
        <span className="font-display text-xl font-bold text-gold">{specialist.initials}</span>
      </div>
      <div className="text-center">
        <p className="font-medium text-ink group-hover:text-gold transition-colors">{specialist.name}</p>
        <p className="text-ink-3 text-xs mt-1 leading-snug">{specialist.specialty}</p>
      </div>
    </button>
  );
}

function BackButton({ onClick }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5 text-ink-3 hover:text-gold text-sm mb-6 transition-colors duration-150 cursor-pointer"
    >
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
      </svg>
      Volver
    </button>
  );
}
