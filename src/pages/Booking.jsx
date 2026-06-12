import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { BookingProvider, useBooking } from '../context/BookingContext';
import { useConfig } from '../hooks/useConfig';
import { useServices } from '../hooks/useServices';
import StepIndicator from '../components/booking/StepIndicator';
import BranchSelector from '../components/booking/BranchSelector';
import ServiceSelector from '../components/booking/ServiceSelector';
import SpecialistSelector from '../components/booking/SpecialistSelector';
import DateTimePicker from '../components/booking/DateTimePicker';
import ClientForm from '../components/booking/ClientForm';
import BookingConfirmation from '../components/booking/BookingConfirmation';
import BookingSummary from '../components/booking/BookingSummary';
import BookingUnavailable from '../components/booking/BookingUnavailable';

export default function Booking() {
  // Clear saved progress when leaving /agendar so the next visit starts fresh.
  // Page refreshes do NOT trigger this (component doesn't unmount), so
  // sessionStorage still restores state across accidental refreshes.
  useEffect(() => {
    return () => sessionStorage.removeItem('cita24_booking');
  }, []);

  return (
    <BookingProvider>
      <BookingFlow />
    </BookingProvider>
  );
}

function BookingFlow() {
  const { state, dispatch } = useBooking();
  const { data: config, isLoading: configLoading } = useConfig();
  const { data: catalog } = useServices();
  const qc = useQueryClient();

  // Mantiene servicios/especialistas seleccionados sincronizados con el catálogo
  // fresco (precio/duración/nombre), tras restaurar sesión o si cambian server-side.
  // react-query dedupe: no agrega red (ServiceSelector usa la misma query).
  useEffect(() => {
    if (catalog?.services?.length) {
      dispatch({ type: 'RECONCILE_CATALOG', payload: catalog });
    }
  }, [catalog, dispatch]);

  const branches     = config?.branches ?? [];
  const multiBranch  = branches.length > 1;
  const isBranchStep = multiBranch && !state.branch;
  const indicatorStep = isBranchStep ? 0 : state.step;

  // Invalidate downstream queries so each revisited step loads fresh data.
  function handleNavigate(targetStep) {
    if (targetStep <= 1) qc.invalidateQueries({ queryKey: ['services'] });
    if (targetStep <= 2) qc.invalidateQueries({ queryKey: ['specialists'] });
    if (targetStep <= 3) qc.invalidateQueries({ queryKey: ['availability'] });
    dispatch({ type: 'GO_TO_STEP', payload: targetStep });
  }

  if (!configLoading && config?.booking_available === false) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-10">
        <BookingUnavailable />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      {state.step < 5 && (
        <StepIndicator
          currentStep={indicatorStep}
          hasBranch={multiBranch}
          onNavigate={handleNavigate}
        />
      )}
      {!isBranchStep && state.step >= 1 && state.step <= 4 && (state.branch || state.services?.length > 0) && <BookingSummary />}
      {isBranchStep                     && <BranchSelector branches={branches} />}
      {!isBranchStep && state.step === 1 && <ServiceSelector />}
      {!isBranchStep && state.step === 2 && <SpecialistSelector />}
      {!isBranchStep && state.step === 3 && <DateTimePicker />}
      {!isBranchStep && state.step === 4 && <ClientForm />}
      {!isBranchStep && state.step === 5 && <BookingConfirmation />}
    </div>
  );
}
