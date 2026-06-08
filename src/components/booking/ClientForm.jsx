import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useBooking } from '../../context/BookingContext';
import { isGroupMode } from '../../context/BookingContext';
import { useCreateAppointment } from '../../hooks/useAppointment';
import { useConfig } from '../../hooks/useConfig';
import { formatDate, formatTime, formatServicePrice, formatCombinedPrice, toTitleCase } from '../../utils/formatters';
import { api } from '../../services/api';
import Input from '../ui/Input';
import PhoneInput from '../ui/PhoneInput';
import Button from '../ui/Button';
import { useToast } from '../ui/Toast';
import { BackButton } from './SpecialistSelector';
import BookingUnavailable from './BookingUnavailable';

const PERSON_WORD_RE = /^[a-záéíóúüñA-ZÁÉÍÓÚÜÑ]+$/;

function initials(name) {
  return (name || '').split(' ').filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join('') || '?';
}

function namePartErr(label, v) {
  const s = (v || '').trim();
  if (!s) return `Ingresa tu ${label}.`;
  if (s.length > 50) return 'Máximo 50 caracteres.';
  const words = s.split(/\s+/).filter(w => w.length > 0);
  for (const w of words) {
    if (!PERSON_WORD_RE.test(w)) return 'Solo letras, sin números ni símbolos.';
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
  const groupServices      = serviceAssignments.map(a => a.service);
  const totalDuration = groupMode
    ? groupServices.reduce((sum, s) => sum + (s.duration || 0), 0)
    : selectedServices.reduce((sum, s) => sum + (s.duration || 0), 0);
  const combinedPriceStr = groupMode
    ? formatCombinedPrice(groupServices)
    : formatCombinedPrice(selectedServices);

  const displayBranch = state.branch ?? (configBranches.length === 1 ? configBranches[0] : null);

  const [firstName,     setFirstName]     = useState(state.clientFirstName);
  const [lastName,      setLastName]      = useState(state.clientLastName);
  const [phone,         setPhone]         = useState(state.clientPhone);
  const [email,         setEmail]         = useState('');
  const [errors,        setErrors]        = useState({});
  const [quotaExceeded, setQuotaExceeded] = useState(false);

  function validate() {
    const errs = {};
    const fnErr = namePartErr('nombre', firstName);
    if (fnErr) errs.firstName = fnErr;
    const lnErr = namePartErr('apellido', lastName);
    if (lnErr) errs.lastName = lnErr;
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
    dispatch({ type: 'SET_CLIENT', payload: { firstName: firstName.trim(), lastName: lastName.trim(), phone: phone.trim(), email: email.trim() || '' } });

    const branchId = state.branch?.id ?? (configBranches.length === 1 ? configBranches[0].id : null);

    try {
      let result;
      if (groupMode) {
        result = await createGroupMutation.mutateAsync({
          assignments: serviceAssignments.map(a => ({
            serviceId:    a.service.id,
            specialistId: a.specialist.id,
          })),
          date:             state.date,
          time:             state.time,
          clientFirstName:  firstName.trim(),
          clientLastName:   lastName.trim(),
          clientPhone:      phone.trim(),
          clientEmail:      email.trim() || undefined,
          branchId,
        });
      } else {
        result = await createMutation.mutateAsync({
          serviceIds:       selectedServices.map(s => s.id),
          specialistId:     state.specialist.id,
          date:             state.date,
          time:             state.time,
          clientFirstName:  firstName.trim(),
          clientLastName:   lastName.trim(),
          clientPhone:      phone.trim(),
          clientEmail:      email.trim() || undefined,
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
      } else if (err.status === 400) {
        toast(err.message || 'Selecciona otro horario e intenta de nuevo.', 'error');
        dispatch({ type: 'GO_BACK' });
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
            <>
              {serviceAssignments.map((a, i) => {
                const offsetMins = serviceAssignments.slice(0, i).reduce((s, prev) => s + (prev.service.duration || 0), 0);
                const startSlot  = minsToSlot(slotToMins(state.time) + offsetMins);
                return (
                  <div key={i} className="flex items-start gap-3">
                    {/* Service avatar */}
                    <div className="w-9 h-9 rounded-full border-2 border-gold/20 bg-gold/8 flex items-center justify-center shrink-0 overflow-hidden mt-0.5">
                      {a.service?.imageUrl
                        ? <img src={a.service.imageUrl} alt={a.service.name} className="w-full h-full object-cover" />
                        : <span className="text-[11px] font-bold text-gold">{initials(a.service?.name)}</span>
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[14px] font-semibold text-ink leading-tight">
                        {toTitleCase(a.service.name)}
                      </p>
                      {/* Specialist mini-avatar + info */}
                      <div className="flex items-center gap-1.5 mt-1">
                        <div className="w-5 h-5 rounded-full border border-gold/30 bg-gold/8 flex items-center justify-center shrink-0 overflow-hidden">
                          {a.specialist?.avatarUrl
                            ? <img src={a.specialist.avatarUrl} alt={a.specialist.name} className="w-full h-full object-cover" />
                            : <span className="text-[8px] font-bold text-gold">{initials(a.specialist?.name)}</span>
                          }
                        </div>
                        <p className="text-xs text-ink-3 leading-none">
                          {toTitleCase(a.specialist.name)}
                          {' · '}
                          <span className="text-gold font-semibold">{formatTime(startSlot, timeFmt)}</span>
                          {' · '}
                          {a.service.duration} min
                        </p>
                      </div>
                    </div>
                    <p className="text-[14px] font-semibold text-gold tabular-nums shrink-0 mt-0.5">
                      {formatServicePrice(a.service)}
                    </p>
                  </div>
                );
              })}
              {displayBranch?.name && (
                <div className="flex items-center gap-3 pt-0.5">
                  <div className="w-9 h-9 rounded-full border-2 border-gold/20 bg-gold/8 flex items-center justify-center shrink-0 overflow-hidden">
                    {displayBranch.image_url
                      ? <img src={displayBranch.image_url} alt={displayBranch.name} className="w-full h-full object-cover" />
                      : <span className="text-[11px] font-bold text-gold">{initials(displayBranch.name)}</span>
                    }
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-ink-3">Sucursal</p>
                    <p className="text-[13px] font-semibold text-ink">{toTitleCase(displayBranch.name)}</p>
                  </div>
                </div>
              )}
            </>
          ) : (
            <>
              {selectedServices.length > 1 ? (
                <div className="space-y-3">
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-ink-3">Servicios</p>
                  {selectedServices.map((svc, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full overflow-hidden border-2 border-gold/20 bg-gold/8 flex items-center justify-center shrink-0">
                        {svc.imageUrl
                          ? <img src={svc.imageUrl} alt={svc.name} className="w-full h-full object-cover" />
                          : <span className="text-[11px] font-bold text-gold">{initials(svc.name)}</span>
                        }
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-semibold text-ink leading-snug truncate">{toTitleCase(svc.name)}</p>
                        <p className="text-xs text-ink-3 mt-0.5">{svc.duration} min</p>
                      </div>
                      <p className="text-[13px] font-semibold text-gold tabular-nums shrink-0">{formatServicePrice(svc)}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full overflow-hidden border-2 border-gold/20 bg-gold/8 flex items-center justify-center shrink-0">
                    {selectedServices[0]?.imageUrl
                      ? <img src={selectedServices[0].imageUrl} alt={selectedServices[0].name} className="w-full h-full object-cover" />
                      : <span className="text-[11px] font-bold text-gold">{initials(selectedServices[0]?.name)}</span>
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-ink-3 mb-0.5">Servicio</p>
                    <p className="text-[14px] font-semibold text-ink leading-snug">{toTitleCase(selectedServices[0]?.name)}</p>
                    <p className="text-xs text-ink-3 mt-0.5">{selectedServices[0]?.duration} min</p>
                  </div>
                  <p className="text-[14px] font-semibold text-gold tabular-nums shrink-0">{combinedPriceStr}</p>
                </div>
              )}
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full border-2 border-gold/20 bg-gold/8 flex items-center justify-center shrink-0 overflow-hidden">
                  {state.specialist?.avatarUrl
                    ? <img src={state.specialist.avatarUrl} alt={state.specialist.name} className="w-full h-full object-cover" />
                    : <span className="text-[11px] font-bold text-gold">{initials(state.specialist?.name)}</span>
                  }
                </div>
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-ink-3">Especialista</p>
                  <p className="text-[13px] font-semibold text-ink">{toTitleCase(state.specialist?.name)}</p>
                </div>
              </div>
              {displayBranch?.name && (
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full border-2 border-gold/20 bg-gold/8 flex items-center justify-center shrink-0 overflow-hidden">
                    {displayBranch.image_url
                      ? <img src={displayBranch.image_url} alt={displayBranch.name} className="w-full h-full object-cover" />
                      : <span className="text-[11px] font-bold text-gold">{initials(displayBranch.name)}</span>
                    }
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-ink-3">Sucursal</p>
                    <p className="text-[13px] font-semibold text-ink">{toTitleCase(displayBranch.name)}</p>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Total row */}
        <div className="px-5 py-3.5 border-t border-edge flex items-center justify-between bg-raised/30">
          <span className="text-[13px] font-semibold text-ink">Total</span>
          <span className="text-[18px] font-bold text-gold tabular-nums">
            {combinedPriceStr}
          </span>
        </div>
      </div>

      {/* ── Client form ──────────────────────────────────────────────────── */}
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Input
            label="Nombre(s)"
            placeholder="Ej. Juan"
            value={firstName}
            onChange={e => { setFirstName(e.target.value); if (errors.firstName) setErrors(p => ({ ...p, firstName: null })); }}
            onBlur={e => { const err = namePartErr('nombre', e.target.value); if (err) setErrors(p => ({ ...p, firstName: err })); }}
            error={errors.firstName}
            required
            autoComplete="given-name"
            maxLength={50}
          />
          <Input
            label="Apellido(s)"
            placeholder="Ej. García López"
            value={lastName}
            onChange={e => { setLastName(e.target.value); if (errors.lastName) setErrors(p => ({ ...p, lastName: null })); }}
            onBlur={e => { const err = namePartErr('apellido', e.target.value); if (err) setErrors(p => ({ ...p, lastName: err })); }}
            error={errors.lastName}
            required
            autoComplete="family-name"
            maxLength={50}
          />
        </div>
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
