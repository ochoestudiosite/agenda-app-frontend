import { useServices } from '../../hooks/useServices';
import { useBooking } from '../../context/BookingContext';
import { toTitleCase } from '../../utils/formatters';
import Spinner from '../ui/Spinner';

export default function SpecialistSelector() {
  const { data, isLoading } = useServices();
  const { state, dispatch } = useBooking();

  if (isLoading) return (
    <div>
      <div className="h-7 w-24 skeleton rounded-lg mb-6" />
      <div className="mb-7 space-y-2">
        <div className="h-7 w-40 skeleton rounded-xl" />
        <div className="h-4 w-56 skeleton rounded-lg" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="flex sm:flex-col items-center sm:items-center gap-4 sm:gap-3 p-5 rounded-2xl border border-edge bg-card">
            <div className="shrink-0 w-14 h-14 sm:w-16 sm:h-16 rounded-full skeleton" />
            <div className="flex-1 sm:flex-none sm:w-full space-y-2 sm:text-center">
              <div className="h-4 skeleton rounded-lg sm:mx-auto" style={{ width: `${50 + i * 15}%` }} />
              <div className="h-3 skeleton rounded-md sm:mx-auto" style={{ width: `${35 + i * 10}%` }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  // Only show specialists who have the selected service assigned
  const selectedDbId = state.service?.dbId;
  const specialists  = (data?.specialists ?? []).filter(
    sp => !selectedDbId || sp.serviceIds?.includes(selectedDbId),
  );

  return (
    <div className="animate-fade-up">
      <BackButton onClick={() => dispatch({ type: 'GO_BACK' })} />
      <div className="mb-7">
        <h2 className="font-display text-2xl font-semibold text-ink tracking-tight">Elige tu barbero</h2>
        <p className="text-ink-3 text-sm mt-1">
          Para <span className="text-ink font-medium">{toTitleCase(state.service?.name)}</span>
        </p>
      </div>

      {specialists.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center px-6 card">
          <div className="w-12 h-12 rounded-xl bg-raised flex items-center justify-center mb-3">
            <svg className="w-5 h-5 text-ink-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"/>
            </svg>
          </div>
          <p className="text-sm font-semibold text-ink">Sin especialistas disponibles</p>
          <p className="text-xs text-ink-3 mt-1 max-w-xs">
            Ningún miembro del equipo tiene asignado el servicio "{state.service?.name}".
          </p>
          <button
            onClick={() => dispatch({ type: 'GO_BACK' })}
            className="mt-5 text-xs font-semibold text-gold hover:underline cursor-pointer"
          >
            Volver a elegir servicio
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {specialists.map((sp, i) => (
            <SpecialistCard
              key={sp.id}
              specialist={sp}
              delay={i * 50}
              onSelect={() => dispatch({ type: 'SET_SPECIALIST', payload: sp })}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function SpecialistCard({ specialist, onSelect, delay }) {
  return (
    <button
      onClick={onSelect}
      className="group flex sm:flex-col items-center sm:items-center gap-4 sm:gap-3 p-5 rounded-2xl border border-edge bg-card
                 text-left sm:text-center hover:border-gold/40 hover:shadow-card
                 active:scale-[0.99] transition-all duration-240 cursor-pointer animate-fade-up"
      style={{ animationDelay: `${delay}ms`, animationFillMode: 'both' }}
    >
      {/* Avatar */}
      <div className="shrink-0 w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-raised border-2 border-edge
                      group-hover:border-gold/50 flex items-center justify-center transition-all duration-240 overflow-hidden">
        {specialist.avatarUrl ? (
          <img src={specialist.avatarUrl} alt={specialist.name} className="w-full h-full object-cover" />
        ) : (
          <span className="font-display text-xl font-bold text-gold">{specialist.initials}</span>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 sm:flex-none">
        <p className="font-semibold text-[0.9375rem] text-ink group-hover:text-gold transition-colors duration-160">
          {toTitleCase(specialist.name)}
        </p>
        <p className="text-xs text-ink-3 mt-0.5 sm:mt-1 leading-snug">{specialist.specialty}</p>
      </div>

      {/* Mobile chevron */}
      <svg className="w-4 h-4 text-ink-3 sm:hidden shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
      </svg>
    </button>
  );
}

export function BackButton({ onClick }) {
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-1.5 text-xs font-medium text-ink-3 hover:text-ink mb-6
                 transition-colors duration-160 cursor-pointer group"
    >
      <svg className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform duration-160"
           fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
      </svg>
      Volver
    </button>
  );
}
