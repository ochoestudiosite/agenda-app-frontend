import { BookingProvider, useBooking } from '../context/BookingContext';
import { useConfig } from '../hooks/useConfig';
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
  return (
    <BookingProvider>
      <BookingFlow />
    </BookingProvider>
  );
}

function BookingFlow() {
  const { state } = useBooking();
  const { data: config, isLoading: configLoading } = useConfig();
  const branches    = config?.branches ?? [];
  const multiBranch = branches.length > 1;
  const isBranchStep = multiBranch && !state.branch;

  const indicatorStep = isBranchStep ? 0 : state.step;

  // Block the entire booking flow when the business has no monthly quota left.
  // Only activates once we have a definitive server response (not during loading),
  // so a stale localStorage cache showing true won't lock users out prematurely.
  if (!configLoading && config?.booking_available === false) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-10">
        <BookingUnavailable />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      {state.step < 5 && <StepIndicator currentStep={indicatorStep} hasBranch={multiBranch} />}
      {!isBranchStep && state.step >= 1 && state.step <= 4 && (state.branch || state.service) && <BookingSummary />}
      {isBranchStep                     && <BranchSelector branches={branches} />}
      {!isBranchStep && state.step === 1 && <ServiceSelector />}
      {!isBranchStep && state.step === 2 && <SpecialistSelector />}
      {!isBranchStep && state.step === 3 && <DateTimePicker />}
      {!isBranchStep && state.step === 4 && <ClientForm />}
      {!isBranchStep && state.step === 5 && <BookingConfirmation />}
    </div>
  );
}
