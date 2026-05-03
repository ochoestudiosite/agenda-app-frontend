import { BookingProvider, useBooking } from '../context/BookingContext';
import { useConfig } from '../hooks/useConfig';
import StepIndicator from '../components/booking/StepIndicator';
import BranchSelector from '../components/booking/BranchSelector';
import ServiceSelector from '../components/booking/ServiceSelector';
import SpecialistSelector from '../components/booking/SpecialistSelector';
import DateTimePicker from '../components/booking/DateTimePicker';
import ClientForm from '../components/booking/ClientForm';
import BookingConfirmation from '../components/booking/BookingConfirmation';

export default function Booking() {
  return (
    <BookingProvider>
      <BookingFlow />
    </BookingProvider>
  );
}

function BookingFlow() {
  const { state } = useBooking();
  const { data: config } = useConfig();
  const branches    = config?.branches ?? [];
  const multiBranch = branches.length > 1;
  const isBranchStep = multiBranch && !state.branch;

  const indicatorStep = isBranchStep ? 0 : state.step;

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      {state.step < 5 && <StepIndicator currentStep={indicatorStep} hasBranch={multiBranch} />}
      {isBranchStep                     && <BranchSelector branches={branches} />}
      {!isBranchStep && state.step === 1 && <ServiceSelector />}
      {!isBranchStep && state.step === 2 && <SpecialistSelector />}
      {!isBranchStep && state.step === 3 && <DateTimePicker />}
      {!isBranchStep && state.step === 4 && <ClientForm />}
      {!isBranchStep && state.step === 5 && <BookingConfirmation />}
    </div>
  );
}
