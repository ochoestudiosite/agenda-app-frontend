import { useState } from 'react';
import AppointmentLookup from '../components/manage/AppointmentLookup';
import AppointmentCard from '../components/manage/AppointmentCard';
import { useAppointmentLookup } from '../hooks/useAppointment';

export default function Manage() {
  const [searchCode, setSearchCode] = useState('');
  const [activeCode, setActiveCode] = useState('');

  const { data, isLoading, isError, error } = useAppointmentLookup(activeCode);
  const [localAppt, setLocalAppt] = useState(null);

  const appointment = localAppt || data;

  function handleSearch(code) {
    setLocalAppt(null);
    setSearchCode(code);
    setActiveCode(code);
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <div className="text-center mb-10">
        <h1 className="font-display text-3xl font-bold mb-2 text-ink">Gestiona tu cita</h1>
        <p className="text-ink-2">Ingresa tu código de confirmación para ver, reagendar o cancelar tu cita.</p>
      </div>

      <AppointmentLookup onSearch={handleSearch} loading={isLoading} />

      {/* Results */}
      <div className="mt-8">
        {isError && (
          <p className="text-center text-red-400 text-sm">
            {error?.status === 404 ? 'No se encontró ninguna cita con ese código.' : error?.message || 'Error al buscar la cita.'}
          </p>
        )}

        {appointment && (
          <AppointmentCard
            appointment={appointment}
            onUpdated={(updated) => setLocalAppt(updated)}
          />
        )}
      </div>
    </div>
  );
}
