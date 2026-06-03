import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import AppointmentLookup from '../components/manage/AppointmentLookup';
import AppointmentCard from '../components/manage/AppointmentCard';
import GroupAppointmentCard from '../components/manage/GroupAppointmentCard';
import { useAppointmentLookup, useGroupAppointmentLookup } from '../hooks/useAppointment';
import { useToast } from '../components/ui/Toast';

const CODE_RE = /^[A-Z0-9]{6,12}$/;

export default function Manage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [localAppt, setLocalAppt]       = useState(null);
  const toast                            = useToast();
  const prevData                         = useRef(null);

  const rawParam   = (searchParams.get('code') || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  const activeCode = CODE_RE.test(rawParam) ? rawParam : '';

  // Try individual lookup first. Only fall back to the group endpoint when the
  // single one 404s — avoids a noisy /appointments/group/:code 404 on every
  // normal individual booking.
  const singleQuery = useAppointmentLookup(activeCode);
  const singleMissing = singleQuery.isError && singleQuery.error?.status === 404;
  const groupQuery  = useGroupAppointmentLookup(activeCode, singleMissing);

  const isGroup     = !singleQuery.data && !!groupQuery.data;
  const data        = singleQuery.data ?? groupQuery.data ?? null;
  const isLoading   = singleQuery.isLoading || (singleMissing && groupQuery.isLoading);
  // Error only when the single lookup failed for a non-404 reason, or the group
  // fallback also failed to find the code.
  const isError     = !isLoading && !!activeCode && !data &&
    ((singleQuery.isError && !singleMissing) || (singleMissing && groupQuery.isError));
  const error       = (singleMissing ? groupQuery.error : singleQuery.error) ?? null;

  const appointment = localAppt || data;

  useEffect(() => {
    if (data && !prevData.current) toast('Cita encontrada', 'success');
    prevData.current = data;
  }, [data]);

  function handleSearch(code) {
    setLocalAppt(null);
    prevData.current = null;
    setSearchParams(code ? { code } : {}, { replace: true });
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
        <AppointmentLookup
          key={activeCode}
          initialCode={activeCode}
          onSearch={handleSearch}
          loading={isLoading}
        />
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

        {appointment && isGroup && (
          <GroupAppointmentCard
            group={appointment}
            onUpdated={updated => setLocalAppt(updated)}
          />
        )}

        {appointment && !isGroup && (
          <AppointmentCard
            appointment={appointment}
            onUpdated={updated => setLocalAppt(updated)}
          />
        )}
      </div>
    </div>
  );
}
