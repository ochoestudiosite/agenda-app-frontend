import { useState } from 'react';
import AppointmentLookup from '../components/manage/AppointmentLookup';
import AppointmentCard from '../components/manage/AppointmentCard';
import { useAppointmentLookup } from '../hooks/useAppointment';

export default function Manage() {
  const [activeCode, setActiveCode] = useState('');
  const [localAppt,  setLocalAppt]  = useState(null);

  const { data, isLoading, isError, error } = useAppointmentLookup(activeCode);

  const appointment = localAppt || data;

  function handleSearch(code) {
    setLocalAppt(null);
    setActiveCode(code);
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      <div className="text-center mb-10 animate-fade-up">
        <p className="label-section mb-3">Gestiona tu reservación</p>
        <h1 className="font-display text-3xl font-semibold text-ink tracking-tight mb-2">
          Encuentra tu cita
        </h1>
        <p className="text-ink-3 text-sm max-w-xs mx-auto">
          Ingresa tu código de confirmación para ver, reagendar o cancelar
        </p>
      </div>

      <div className="animate-fade-up" style={{ animationDelay: '60ms', animationFillMode: 'both' }}>
        <AppointmentLookup onSearch={handleSearch} loading={isLoading} />
      </div>

      <div className="mt-8">
        {isError && (
          <div className="animate-fade-in text-center">
            <div className="inline-flex items-center gap-2 px-4 py-3 rounded-xl bg-red-500/6 border border-red-500/20 text-sm text-red-500">
              <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              {error?.status === 404
                ? 'No se encontró ninguna cita con ese código.'
                : error?.message || 'Error al buscar la cita.'}
            </div>
          </div>
        )}

        {appointment && (
          <AppointmentCard
            appointment={appointment}
            onUpdated={updated => setLocalAppt(updated)}
          />
        )}
      </div>
    </div>
  );
}
