import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useBooking } from '../../context/BookingContext';
import { isGroupMode } from '../../context/BookingContext';
import { useCreateAppointment } from '../../hooks/useAppointment';
import { useConfig } from '../../hooks/useConfig';
import { formatDate, formatTime, formatPrice, formatServicePrice, toTitleCase } from '../../utils/formatters';
import { api } from '../../services/api';
import Input from '../ui/Input';
import PhoneInput from '../ui/PhoneInput';
import Button from '../ui/Button';
import { useToast } from '../ui/Toast';
import { BackButton } from './SpecialistSelector';
import BookingUnavailable from './BookingUnavailable';

const PERSON_WORD_RE = /^[a-záéíóúüñA-ZÁÉÍÓÚÜÑ]+$/;

function personNameErr(v) {
  const s = (v || '').trim();
  if (!s) return 'Ingresa tu nombre completo.';
  const words = s.split(/\s+/).filter(w => w.length > 0);
  if (words.length < 2) return 'Ingresa al menos un nombre y un apellido.';
  for (const w of words) {
    if (!PERSON_WORD_RE.test(w)) return 'Solo letras y espacios, sin números ni símbolos.';
    if (w.length < 2) return 'Cada palabra debe tener al menos 2 letras.';
  }
  return null;
}

function slotToMins(slot) {
  if (!slot) return 0;
  const [h, m] = slot.split(':').map(Number);
  return h * 60 + m;
}
function minsToSlot(mins) {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${h}:${String(m).padStart(2, '0')}`;
}

export default function ClientForm() {
  const { state, dispatch } = useBooking();
  const { data: config }    = useConfig();
  const qc                  = useQueryClient();
  const timeFmt             = config?.time_format ?? '12h';
  const configBranches      = config?.branches ?? [];
  const toast               = useToast();
  const groupMode           = isGroupMode(state);

  const createMutation = useCreateAppointment();
  const createGroupMutation = useMutation({
    mutationFn: api.createGroupAppointment,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['availability'] }); },
  });
  const isPending = createMutation.isPending || createGroupMutation.isPending;

  const selectedServices   = state.services ?? [];
  const serviceAssignments = state.serviceAssignments ?? [];
  const totalPrice = groupMode
    ? serviceAssignments.reduce((sum, a) => sum + (a.service.priceType === 'ask' ? 0 : (a.service.price || 0)), 0)
    : selectedServices.reduce((sum, s) => sum + (s.priceType === 'ask' ? 0 : (s.price || 0)), 0);
  const hasAskPrice = groupMode
    ? serviceAssignments.some(a => a.service.priceType === 'ask')
    : selectedServices.some(s => s.priceType === 'ask');
  const totalDuration = groupMode
    ? serviceAssignments.reduce((sum, a) => sum + (a.service.duration || 0), 0)
    : selectedServices.reduce((sum, s) => sum + (s.duration || 0), 0);

  const [name,          setName]          = useState(state.clientName);
  const [phone,         setPhone]         = useState(state.clientPhone);
  const [email,         setEmail]         = useState('');
  const [errors,        setErrors]        = useState({});
  const [quotaExceeded, setQuotaExceeded] = useState(false);

  function validate() {
    const errs = {};
    const nameErr = personNameErr(name);
    if (nameErr) errs.name = nameErr;
    const digits = phone.replace(/\D/g, '');
    if (!digits || digits.length < 7 || digits.length > 15) {
      errs.phone = 'Teléfono inválido. Ingresa entre 7 y 15 dígitos.';
    }
    if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim())) {
      errs.email = 'Ingresa un correo electrónico válido.';
    }
    return errs;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setErrors({});
    dispatch({ type: 'SET_CLIENT', payload: { name: name.trim(), phone: phone.trim() } });

    const branchId = state.branch?.id ?? (configBranches.length === 1 ? configBranches[0].id : null);

    try {
      let result;
      if (groupMode) {
        result = await createGroupMutation.mutateAsync({
          assignments: serviceAssignments.map(a => ({
            serviceId:    a.service.id,
            specialistId: a.specialist.id,
          })),
          date:        state.date,
          time:        state.time,
          clientName:  name.trim(),
          clientPhone: phone.trim(),
          clientEmail: email.trim() || undefined,
          branchId,
        });
      } else {
        result = await createMutation.mutateAsync({
          serviceIds:   selectedServices.map(s => s.id),
          specialistId: state.specialist.id,
          date:         state.date,
          time:         state.time,
          clientName:   name.trim(),
          clientPhone:  phone.trim(),
          clientEmail:  email.trim() || undefined,
          branchId,
        });
      }
      dispatch({ type: 'SET_CONFIRMATION', payload: result });
    } catch (err) {
      if (err.status === 409) {
        toast('El horario ya no está disponible. Por favor elige otro.', 'error');
        dispatch({ type: 'GO_BACK' });
      } else if (err.code === 'BOOKING_QUOTA_EXCEEDED' || err.status === 503) {
        qc.invalidateQueries({ queryKey: ['config'] });
        setQuotaExceeded(true);
      } else {
        toast(err.message || 'Error al crear la cita.', 'error');
      }
    }
  }

  if (quotaExceeded) return <BookingUnavailable />;

  return (
    <div className="animate-fade-up max-w-lg mx-auto">
      <BackButton onClick={() => dispatch({ type: 'GO_BACK' })} />
      <div className="mb-7">
        <h2 className="font-display text-2xl font-semibold text-ink tracking-tight">Confirma tu cita</h2>
        <p className="text-ink-3 text-sm mt-1">Revisa los detalles y completa tus datos</p>
      </div>

      {/* ── Booking summary card ──────────────────────────────────────────── */}
      <div className="card overflow-hidden mb-6">

        {/* Date + Time header */}
        <div className="px-5 py-4 flex items-center gap-4 bg-raised/40 border-b border-edge">
          <div className="w-10 h-10 rounded-xl bg-gold/10 border border-gold/20 flex flex-col items-center justify-center shrink-0">
            <span className="text-[8px] font-bold uppercase tracking-widest text-gold leading-none">
              {state.date
                ? new Date(state.date + 'T12:00:00').toLocaleDateString('es-MX', { month: 'short' })
                : '—'}
            </span>
            <span className="text-[18px] font-bold text-gold leading-tight tabular-nums">
              {state.date?.split('-')[2] ?? '—'}
            </span>
          </div>
          <div>
            <p className="text-[13px] font-semibold text-ink">{formatDate(state.date)}</p>
            <p className="text-[15px] font-bold text-gold tabular-nums">{formatTime(state.time, timeFmt)}</p>
          </div>
          {groupMode && (
            <div className="ml-auto text-right">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-ink-3">Total</p>
              <p className="text-[13px] font-bold text-gold tabular-nums">{totalDuration} min</p>
            </div>
          )}
        </div>

        {/* Services */}
        <div className="px-5 py-4 space-y-3.5">
          {groupMode ? (
            serviceAssignments.map((a, i) => {
              const offsetMins = serviceAssignments.slice(0, i).reduce((s, prev) => s + (prev.service.duration || 0), 0);
              const startSlot  = minsToSlot(slotToMins(state.time) + offsetMins);
              return (
                <div key={i} className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-2.5 flex-1 min-w-0">
                    <div className="w-5 h-5 rounded-full bg-gold/10 flex items-center justify-center shrink-0 mt-0.5">
                      <span className="text-[9px] font-bold text-gold">{i + 1}</span>
                    </div>
                    <div className="min-w-0">
                      <p className="text-[14px] font-semibold text-ink leading-tight">
                        {toTitleCase(a.service.name)}
                      </p>
                      <p className="text-xs text-ink-3 mt-0.5">
                        {toTitleCase(a.specialist.name)}
                        {' · '}
                        <span className="text-gold font-semibold">{formatTime(startSlot, timeFmt)}</span>
                        {' · '}
                        {a.service.duration} min
                      </p>
                    </div>
                  </div>
                  <p className="text-[14px] font-semibold text-gold tabular-nums shrink-0">
                    {formatServicePrice(a.service)}
                  </p>
                </div>
              );
            })
          ) : (
            <>
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-ink-3 mb-1">
                    {selectedServices.length > 1 ? 'Servicios' : 'Servicio'}
                  </p>
                  <p className="text-[14px] font-semibold text-ink">
                    {selectedServices.map(s => toTitleCase(s.name)).join(' + ')}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-[14px] font-semibold text-gold tabular-nums">
                    {hasAskPrice ? (totalPrice > 0 ? `${formatPrice(totalPrice)}+` : 'Precio a consultar') : formatPrice(totalPrice)}
                  </p>
                  <p className="text-xs text-ink-3 mt-0.5">{totalDuration} min</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-gold/8 border border-gold/20 flex items-center justify-center shrink-0 text-[11px] font-bold text-gold">
                  {state.specialist?.name?.charAt(0)?.toUpperCase() || '?'}
                </div>
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-ink-3">Especialista</p>
                  <p className="text-[13px] font-semibold text-ink">{toTitleCase(state.specialist?.name)}</p>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Total row */}
        <div className="px-5 py-3.5 border-t border-edge flex items-center justify-between bg-raised/30">
          <span className="text-[13px] font-semibold text-ink">Total</span>
          <span className="text-[18px] font-bold text-gold tabular-nums">
            {hasAskPrice ? (totalPrice > 0 ? `${formatPrice(totalPrice)}+` : 'Precio a consultar') : formatPrice(totalPrice)}
          </span>
        </div>
      </div>

      {/* ── Client form ──────────────────────────────────────────────────── */}
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <Input
          label="Nombre completo"
          placeholder="Ej. Juan García López"
          value={name}
          onChange={e => { setName(e.target.value); if (errors.name) setErrors(p => ({ ...p, name: null })); }}
          onBlur={e => { const err = personNameErr(e.target.value); if (err) setErrors(p => ({ ...p, name: err })); }}
          error={errors.name}
          required
          autoComplete="name"
          maxLength={100}
        />
        <PhoneInput
          label="Teléfono"
          placeholder="55 1234 5678"
          value={phone}
          onChange={e => setPhone(e.target.value)}
          error={errors.phone}
          required
          autoComplete="tel"
          helper="10 dígitos (asegúrate de incluir la lada)"
        />
        <Input
          label="Correo electrónico"
          placeholder="tu@correo.com"
          value={email}
          onChange={e => setEmail(e.target.value)}
          error={errors.email}
          autoComplete="email"
          type="email"
          maxLength={120}
          helper="Opcional · Recibirás confirmación y recordatorios"
        />
        <Button type="submit" size="lg" className="w-full mt-2" loading={isPending}>
          Confirmar reservación
        </Button>
      </form>
    </div>
  );
}
