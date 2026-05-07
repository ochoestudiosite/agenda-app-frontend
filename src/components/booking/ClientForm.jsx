import { useState } from 'react';
import { useBooking } from '../../context/BookingContext';
import { useCreateAppointment } from '../../hooks/useAppointment';
import { useConfig } from '../../hooks/useConfig';
import { formatDate, formatTime, formatPrice, toTitleCase } from '../../utils/formatters';
import Input from '../ui/Input';
import PhoneInput from '../ui/PhoneInput';
import Button from '../ui/Button';
import { useToast } from '../ui/Toast';
import { BackButton } from './SpecialistSelector';

export default function ClientForm() {
  const { state, dispatch } = useBooking();
  const { data: config }   = useConfig();
  const timeFmt        = config?.time_format ?? '12h';
  const configBranches = config?.branches ?? [];
  const toast          = useToast();
  const createMutation = useCreateAppointment();

  const [name,   setName]   = useState(state.clientName);
  const [phone,  setPhone]  = useState(state.clientPhone);
  const [errors, setErrors] = useState({});

  function validate() {
    const errs = {};
    if (!name.trim() || name.trim().length < 2) errs.name = 'Ingresa tu nombre completo (mínimo 2 caracteres).';
    
    const COUNTRIES = ['+52', '+1', '+57', '+54', '+34', '+56', '+51'];
    const code = COUNTRIES.find(c => phone.startsWith(c)) || '';
    const rawNumber = phone.slice(code.length).replace(/\D/g, '');
    
    if (rawNumber.length !== 10) errs.phone = 'El teléfono debe tener 10 dígitos.';
    return errs;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setErrors({});
    dispatch({ type: 'SET_CLIENT', payload: { name: name.trim(), phone: phone.trim() } });
    try {
      const result = await createMutation.mutateAsync({
        serviceId:    state.service.id,
        specialistId: state.specialist.id,
        date:         state.date,
        time:         state.time,
        clientName:   name.trim(),
        clientPhone:  phone.trim(),
        branchId:     state.branch?.id ?? (configBranches.length === 1 ? configBranches[0].id : null),
      });
      dispatch({ type: 'SET_CONFIRMATION', payload: result });
    } catch (err) {
      if (err.status === 409) {
        toast('El horario ya no está disponible. Por favor elige otro.', 'error');
        dispatch({ type: 'GO_BACK' });
      } else {
        toast(err.message || 'Error al crear la cita.', 'error');
      }
    }
  }

  return (
    <div className="animate-fade-up max-w-lg mx-auto">
      <BackButton onClick={() => dispatch({ type: 'GO_BACK' })} />
      <div className="mb-7">
        <h2 className="font-display text-2xl font-semibold text-ink tracking-tight">Confirma tu cita</h2>
        <p className="text-ink-3 text-sm mt-1">Revisa los detalles y completa tus datos</p>
      </div>
      <div className="card p-5 mb-6 space-y-3">
        <SummaryRow label="Servicio" value={toTitleCase(state.service?.name)} />
        <SummaryRow label="Especialista" value={toTitleCase(state.specialist?.name)} />
        <SummaryRow label="Fecha"    value={formatDate(state.date)} />
        <SummaryRow label="Hora"     value={formatTime(state.time, timeFmt)} />
        <div className="pt-3 border-t border-edge flex justify-between items-center">
          <span className="text-sm font-semibold text-ink">Total</span>
          <span className="text-lg font-semibold text-gold tabular-nums">{formatPrice(state.service?.price)}</span>
        </div>
      </div>
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <Input label="Nombre completo" placeholder="Juan García" value={name}
          onChange={e => setName(e.target.value)} error={errors.name} required autoComplete="name" maxLength={60} />
        <PhoneInput label="Teléfono" placeholder="55 1234 5678" value={phone}
          onChange={e => setPhone(e.target.value)}
          error={errors.phone} required autoComplete="tel"
          helper="10 dígitos (asegúrate de incluir la lada)" />
        <Button type="submit" size="lg" className="w-full mt-2" loading={createMutation.isPending}>
          Confirmar reservación
        </Button>
      </form>
    </div>
  );
}

function SummaryRow({ label, value }) {
  return (
    <div className="flex justify-between items-center gap-4">
      <span className="text-sm text-ink-3">{label}</span>
      <span className="text-sm font-medium text-ink text-right">{value}</span>
    </div>
  );
}
