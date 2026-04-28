import { useServices } from '../../hooks/useServices';
import { useBooking } from '../../context/BookingContext';
import { formatPrice } from '../../utils/formatters';
import Spinner from '../ui/Spinner';

export default function ServiceSelector() {
  const { data, isLoading, isError } = useServices();
  const { dispatch } = useBooking();

  if (isLoading) return <div className="flex justify-center py-16"><Spinner size="lg" /></div>;
  if (isError)   return <p className="text-red-500 text-sm text-center py-8">No se pudieron cargar los servicios.</p>;

  return (
    <div className="animate-slide-up">
      <h2 className="font-display text-2xl font-semibold mb-1 text-ink">Elige tu servicio</h2>
      <p className="text-ink-2 text-sm mb-6">Selecciona el servicio que deseas reservar</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {data.services.map(service => (
          <ServiceCard
            key={service.id}
            service={service}
            onSelect={() => dispatch({ type: 'SET_SERVICE', payload: service })}
          />
        ))}
      </div>
    </div>
  );
}

function ServiceCard({ service, onSelect }) {
  return (
    <button
      onClick={onSelect}
      className="card text-left p-4 hover:border-gold/50 hover:bg-raised transition-all duration-200 group active:scale-[0.99] cursor-pointer"
    >
      <div className="flex justify-between items-start gap-2">
        <div>
          <p className="font-medium text-ink group-hover:text-gold transition-colors">{service.name}</p>
          <p className="text-ink-3 text-xs mt-1 leading-relaxed">{service.description}</p>
        </div>
        <div className="text-right shrink-0">
          <p className="text-gold font-semibold tabular-nums">{formatPrice(service.price)}</p>
          <p className="text-ink-3 text-xs mt-0.5">{service.duration} min</p>
        </div>
      </div>
    </button>
  );
}
