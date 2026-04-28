import { BookingProvider, useBooking } from '../context/BookingContext';
import StepIndicator from '../components/booking/StepIndicator';
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

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      {state.step < 5 && <StepIndicator currentStep={state.step} />}
      {state.step === 1 && <ServiceSelector />}
      {state.step === 2 && <SpecialistSelector />}
      {state.step === 3 && <DateTimePicker />}
      {state.step === 4 && <ClientForm />}
      {state.step === 5 && <BookingConfirmation />}
    </div>
  );
}
