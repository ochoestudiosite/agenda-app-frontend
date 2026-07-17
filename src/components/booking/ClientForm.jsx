import { useState, useEffect, useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useBooking } from '../../context/BookingContext';
import { isGroupMode } from '../../context/BookingContext';
import { useCreateAppointment } from '../../hooks/useAppointment';
import { useConfig } from '../../hooks/useConfig';
import { formatDate, formatTime, formatServicePrice, formatCombinedPrice, formatPrice, promoSavings, toTitleCase } from '../../utils/formatters';
import { api } from '../../services/api';
import Input from '../ui/Input';
import PhoneInput, { COUNTRIES } from '../ui/PhoneInput';
import Button from '../ui/Button';
import { PromoTag, StruckPrice, SavingsNote } from '../ui/PromoPrice';
import { useToast } from '../ui/Toast';
import EntityAvatar from '../ui/EntityAvatar';
import { BackButton } from './SpecialistSelector';
import BookingUnavailable from './BookingUnavailable';
import OTPPanel from './OTPPanel';

const PERSON_WORD_RE = /^[a-záéíóúüñA-ZÁÉÍÓÚÜÑ]+$/;

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

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

// Expected national-number length per country. Argentina mobile numbers carry
// an extra "9" mobile prefix in full international notation (10-11 digits);
// kept as a range rather than a single value to avoid rejecting real numbers.
const PHONE_DIGIT_RULES = {
  '+52': [10, 10], // México
  '+1':  [10, 10], // USA/Canadá
  '+57': [10, 10], // Colombia
  '+54': [10, 11], // Argentina
  '+34': [9, 9],   // España
  '+56': [9, 9],   // Chile
  '+51': [9, 9],   // Perú
};

// PhoneInput caps the national number at 10 digits, so the total digit count
// (country code + number) reaches the 10 digits the booking API requires
// (POST /api/appointments matches /^\+?\d{10,15}$/) for the countries that need 10.
function phoneErr(v) {
  const phone = (v || '').trim();
  const country = COUNTRIES.find(c => phone.startsWith(c.code));
  const codeDigits = country ? country.code.replace(/\D/g, '').length : 0;
  const nationalDigits = phone.replace(/\D/g, '').length - codeDigits;
  const [min, max] = (country && PHONE_DIGIT_RULES[country.code]) || [9, 10];
  if (nationalDigits < min || nationalDigits > max) {
    return min === max
      ? `Teléfono inválido. Ingresa los ${min} dígitos de tu número.`
      : `Teléfono inválido. Ingresa entre ${min} y ${max} dígitos de tu número.`;
  }
  return null;
}

function emailErr(v) {
  const s = (v || '').trim();
  if (s && !EMAIL_RE.test(s)) return 'Ingresa un correo electrónico válido.';
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
  const businessName        = config?.business_name || 'este negocio';
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
  const activeServices = groupMode ? groupServices : selectedServices;

  // Pricing definitivo del servidor (llega con request-otp, ya con el teléfono
  // del cliente — cubre per_client_limit y promos agotadas). Mientras no exista,
  // se muestra el precio promocional del catálogo (mejor información conocida).
  const [serverPricing, setServerPricing] = useState(null);
  const displayServices = serverPricing?.items?.length === activeServices.length
    ? activeServices.map((s, i) => {
        const item = serverPricing.items[i];
        if (!(item?.discountAmount > 0)) return { ...s, promo: null };
        return {
          ...s,
          promo: {
            ...(s.promo ?? {}),
            name:           item.promoName || s.promo?.name || 'Promoción',
            finalPrice:     item.finalPrice,
            discountAmount: item.discountAmount,
            discountType:   item.promoType  || s.promo?.discountType  || null,
            discountValue:  item.promoValue ?? s.promo?.discountValue ?? null,
          },
        };
      })
    : activeServices;

  // La promo que el cliente vio en el catálogo ya no aplica (total o parcialmente)
  const expectedSavings = promoSavings(activeServices);
  const promoDropped    = serverPricing != null && serverPricing.totalDiscount < expectedSavings;

  const combinedPriceStr = formatCombinedPrice(displayServices);
  // Desglose de promoción: total de lista (sin promos), ahorro y nombres únicos.
  const totalSavings        = promoSavings(displayServices);
  const originalCombinedStr = totalSavings > 0
    ? formatCombinedPrice(displayServices.map(s => ({ ...s, promo: null })))
    : null;
  const promoNames = [...new Set(displayServices.filter(s => s.promo).map(s => s.promo.name))].join(' + ');

  // Precio de una línea de servicio: tachado + promocional cuando aplica.
  const servicePriceTag = (svc, size = 'md') => svc?.promo
    ? <StruckPrice original={formatServicePrice(svc)} final={formatServicePrice({ ...svc, price: svc.promo.finalPrice })} size={size} className="mt-0.5" />
    : <p className="text-[14px] font-semibold text-gold tabular-nums shrink-0 mt-0.5">{formatServicePrice(svc)}</p>;

  const displayBranch = state.branch ?? (configBranches.length === 1 ? configBranches[0] : null);

  const [firstName,     setFirstName]     = useState(state.clientFirstName);
  const [lastName,      setLastName]      = useState(state.clientLastName);
  const [phone,         setPhone]         = useState(state.clientPhone);
  const [email,         setEmail]         = useState('');
  const [errors,        setErrors]        = useState({});
  const [quotaExceeded, setQuotaExceeded] = useState(false);

  // ── Código promocional (Fase 2) ────────────────────────────────────────────
  const promoEnabled = config?.promotions_enabled === true;
  const [promoOpen,     setPromoOpen]     = useState(false);
  const [promoInput,    setPromoInput]    = useState('');
  const [appliedCode,   setAppliedCode]   = useState(null);  // código validado que viaja en la reserva
  const [promoStatus,   setPromoStatus]   = useState(null);  // { ok, message }
  const [promoChecking, setPromoChecking] = useState(false);

  // ── OTP sub-flow ──────────────────────────────────────────────────────────
  const [otpPhase,       setOtpPhase]       = useState(false);
  const [pendingId,      setPendingId]      = useState(null);
  const [otpClientKey,   setOtpClientKey]   = useState(null); // client data snapshot when the last OTP was sent
  const [submitting,     setSubmitting]     = useState(false);
  const [otpError,       setOtpError]       = useState(null);
  const [otpKey,         setOtpKey]         = useState(0);   // bump to re-mount OTPPanel
  const [resendCooldown, setResendCooldown] = useState(0);
  const resendInFlightRef = useRef(false); // prevents double-submit on rapid taps
  const submitInFlightRef = useRef(false); // prevents double-submit on the confirm action

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const id = setInterval(() => setResendCooldown(c => Math.max(0, c - 1)), 1000);
    return () => clearInterval(id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resendCooldown > 0]);

  function validate() {
    const errs = {};
    const fnErr = namePartErr('nombre', firstName);
    if (fnErr) errs.firstName = fnErr;
    const lnErr = namePartErr('apellido', lastName);
    if (lnErr) errs.lastName = lnErr;
    const phErr = phoneErr(phone);
    if (phErr) errs.phone = phErr;
    const emErr = emailErr(email);
    if (emErr) errs.email = emErr;
    return errs;
  }

  // Snapshot of the client fields that end up in pending_bookings.booking_data.
  // Used to detect edits made after an OTP was sent (back -> change name/email -> resubmit),
  // which would otherwise create the appointment with stale data.
  function clientKey() {
    return JSON.stringify([firstName.trim(), lastName.trim(), phone.trim(), email.trim()]);
  }

  // Resolves the same branchId used server-side to scope pricing/promos:
  // explicit selection when the tenant has multiple sucursales, or the sole
  // branch when there's only one (matches request-otp / createAppointment).
  function getBranchId() {
    return state.branch?.id ?? (configBranches.length === 1 ? configBranches[0].id : null);
  }

  // Builds the full booking payload for both single and group modes.
  function buildBookingPayload() {
    const branchId = getBranchId();
    const base = {
      date:            state.date,
      time:            state.time,
      clientFirstName: firstName.trim(),
      clientLastName:  lastName.trim(),
      clientPhone:     phone.trim(),
      clientEmail:     email.trim() || undefined,
      branchId,
      ...(appliedCode ? { promoCode: appliedCode } : {}),
    };
    if (groupMode) {
      return { ...base, assignments: serviceAssignments.map(a => ({ serviceId: a.service.id, specialistId: a.specialist.id })) };
    }
    return { ...base, serviceIds: selectedServices.map(s => s.id), specialistId: state.specialist.id };
  }

  // Valida el código contra el backend con el contexto del slot (fecha/hora) —
  // el descuento real se revalida server-side al crear la cita. El preview de
  // precios usa el mismo mecanismo que serverPricing (items[] alineado con
  // activeServices, mismo orden de slugs).
  async function handleApplyPromo() {
    const code = promoInput.trim().toUpperCase();
    if (!code) return;
    setPromoChecking(true);
    setPromoStatus(null);
    try {
      const slugs = activeServices.map(s => s.id);
      // Pasar el teléfono (ya ingresado) hace el preview preciso: evalúa
      // "solo clientes nuevos" y el límite por cliente sobre su propio número.
      const cleanPhone = phone.trim();
      const branchId = getBranchId();
      const res = await api.validatePromo({
        code, serviceIds: slugs, date: state.date, time: state.time,
        ...(phoneErr(cleanPhone) ? {} : { clientPhone: cleanPhone }),
        ...(branchId ? { branchId } : {}),
      });
      if (!res.valid) {
        // res.pricing solo falta en el caso 'invalid' (anti-enumeración); para
        // un código real que no aplica (slot/new_clients_only/per_client_limit/
        // not_eligible) el backend SÍ manda el pricing recalculado (promo
        // automática de catálogo vigente, si hay) — conservarlo en vez de
        // forzar el precio de catálogo inicial, potencialmente desactualizado.
        setAppliedCode(null);
        setServerPricing(res.pricing ?? null);
        setPromoStatus({ ok: false, message: res.message || 'Código no válido o expirado.' });
      } else if (res.codeApplied === false) {
        // Code is valid but a better catalog promo is already applied — don't mark
        // as applied (the code didn't contribute to the discount).
        setAppliedCode(null);
        setServerPricing(res.pricing ?? null);
        setPromoStatus({ ok: false, message: res.message || 'Ya tienes un descuento igual o mayor aplicado.' });
      } else {
        setAppliedCode(code);
        setServerPricing(res.pricing ?? null);
        setPromoStatus({
          ok: true,
          message: `Código aplicado${res.pricing?.totalDiscount > 0 ? ` · ahorras ${formatPrice(res.pricing.totalDiscount)}` : ''}.`,
        });
      }
    } catch (err) {
      setPromoStatus({ ok: false, message: err.message || 'No se pudo validar el código. Intenta de nuevo.' });
    } finally {
      setPromoChecking(false);
    }
  }

  function clearPromo() {
    setAppliedCode(null);
    setPromoInput('');
    setPromoStatus(null);
    setServerPricing(null);
  }

  function handleAppointmentError(err) {
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

  async function handleSubmit(e) {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    // Re-entry guard: a rapid double-tap fires two submit events before the
    // button's `loading` state (one render behind) disables it. Without this,
    // the second request hits the backend slot re-check, gets a 409, and
    // bounces the user from the success screen back to step 4 via GO_BACK —
    // even though the first request already created the appointment.
    if (submitInFlightRef.current) return;
    submitInFlightRef.current = true;
    setErrors({});
    dispatch({ type: 'SET_CLIENT', payload: { firstName: firstName.trim(), lastName: lastName.trim(), phone: phone.trim(), email: email.trim() || '' } });

    try {
      // ── OTP path ─────────────────────────────────────────────────────────────
      if (config?.phone_verification_required) {
        // If the user went back to edit data and resubmitted without changing
        // anything, the previous OTP is still valid (15-min TTL). Reuse it to
        // avoid burning rate-limit quota. Any change to name/phone/email means
        // the stored booking_data is stale, so a fresh pending row is required.
        if (pendingId && clientKey() === otpClientKey) {
          setOtpPhase(true);
          return;
        }

        setSubmitting(true);
        try {
          const { pendingId: id, pricing } = await api.requestOTP(buildBookingPayload());
          setPendingId(id);
          setServerPricing(pricing ?? null);
          setOtpClientKey(clientKey());
          setOtpPhase(true);
          setResendCooldown(60);
        } catch (err) {
          toast(err.message || 'Error al enviar el código. Intenta de nuevo.', 'error');
        } finally {
          setSubmitting(false);
        }
        return;
      }

      // ── Direct create path (OTP not required) ────────────────────────────────
      try {
        const result = groupMode
          ? await createGroupMutation.mutateAsync(buildBookingPayload())
          : await createMutation.mutateAsync(buildBookingPayload());
        dispatch({ type: 'SET_CONFIRMATION', payload: result });
      } catch (err) {
        handleAppointmentError(err);
      }
    } finally {
      submitInFlightRef.current = false;
    }
  }

  async function handleVerifyOTP(code) {
    setSubmitting(true);
    setOtpError(null);
    try {
      const result = await api.confirmOTP({ pendingId, clientPhone: phone.trim(), otpCode: code });
      dispatch({ type: 'SET_CONFIRMATION', payload: result });
      // No setSubmitting(false) — component unmounts on success
    } catch (err) {
      if (err.status === 409) {
        // Slot was taken while awaiting OTP — pending booking deleted server-side.
        // Send user back to date picker to choose another slot.
        toast('El horario ya no está disponible. Por favor elige otro.', 'error');
        dispatch({ type: 'GO_BACK' });
      } else if (err.code === 'BOOKING_QUOTA_EXCEEDED' || err.status === 503) {
        qc.invalidateQueries({ queryKey: ['config'] });
        setQuotaExceeded(true);
      } else {
        setOtpError(err.message || 'Código incorrecto o expirado. Intenta de nuevo.');
        setOtpKey(k => k + 1); // re-mount OTPPanel to clear digits
        setSubmitting(false);
      }
    }
  }

  async function handleResendOTP() {
    if (resendCooldown > 0 || submitting || resendInFlightRef.current) return;
    resendInFlightRef.current = true;
    setSubmitting(true);
    setOtpError(null);
    try {
      const { pendingId: id, pricing } = await api.requestOTP(buildBookingPayload());
      setPendingId(id);
      setServerPricing(pricing ?? null);
      setOtpClientKey(clientKey());
      setOtpKey(k => k + 1);
      setResendCooldown(60);
    } catch (err) {
      setOtpError(err.message || 'Error al reenviar el código.');
      setResendCooldown(15); // brief cooldown on error to avoid accidental spam
    } finally {
      resendInFlightRef.current = false;
      setSubmitting(false);
    }
  }

  if (quotaExceeded) return <BookingUnavailable />;

  return (
    <div className="animate-fade-up max-w-lg mx-auto">
      <BackButton onClick={otpPhase ? () => setOtpPhase(false) : () => dispatch({ type: 'GO_BACK' })} />
      <div className="mb-7">
        <h2 className="font-display text-2xl font-semibold text-ink tracking-tight">
          Confirma tu cita
        </h2>
        <p className="text-ink-3 text-sm mt-1">
          {otpPhase
            ? 'Verifica tu identidad para completar la reservación'
            : 'Revisa los detalles y completa tus datos'}
        </p>
      </div>

      {/* ── Booking summary card ──────────────────────────────────────────── */}
      <div className="card overflow-hidden mb-6">

        {/* Date + Time header */}
        <div className="px-5 py-4 flex items-center gap-4 bg-raised/40 border-b border-edge">
          <div className="w-10 h-10 rounded-xl bg-gold/10 border border-gold/20 flex flex-col items-center justify-center shrink-0">
            <span className="text-[10px] font-bold uppercase tracking-widest text-gold leading-none">
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
              <p className="text-[11px] font-semibold uppercase tracking-widest text-ink-3">Total</p>
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
                const dSvc       = displayServices[i] ?? a.service;
                return (
                  <div key={i} className="flex items-start gap-3">
                    {/* Service avatar */}
                    <EntityAvatar size="summary" name={a.service?.name} imageUrl={a.service?.imageUrl} className="mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 min-w-0">
                        <p className="text-[14px] font-semibold text-ink leading-tight">
                          {toTitleCase(a.service.name)}
                        </p>
                        {dSvc.promo && <PromoTag promotionName={dSvc.promo.name} promotionType={dSvc.promo.discountType} promotionValue={dSvc.promo.discountValue} discountAmount={dSvc.promo.discountAmount} />}
                      </div>
                      {/* Specialist mini-avatar + info */}
                      <div className="flex items-center gap-1.5 mt-1">
                        <EntityAvatar size="summary-mini" name={a.specialist?.name} imageUrl={a.specialist?.avatarUrl} />
                        <p className="text-xs text-ink-3 leading-none">
                          {toTitleCase(a.specialist.name)}
                          {' · '}
                          <span className="text-gold font-semibold">{formatTime(startSlot, timeFmt)}</span>
                          {' · '}
                          {a.service.duration} min
                        </p>
                      </div>
                    </div>
                    {servicePriceTag(dSvc)}
                  </div>
                );
              })}
              {displayBranch?.name && (
                <div className="flex items-center gap-3 pt-0.5">
                  <EntityAvatar size="summary" name={displayBranch.name} imageUrl={displayBranch.image_url} />
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-widest text-ink-3">Sucursal</p>
                    <p className="text-[13px] font-semibold text-ink">{toTitleCase(displayBranch.name)}</p>
                  </div>
                </div>
              )}
            </>
          ) : (
            <>
              {selectedServices.length > 1 ? (
                <div className="space-y-3">
                  <p className="text-[11px] font-semibold uppercase tracking-widest text-ink-3">Servicios</p>
                  {displayServices.map((svc, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <EntityAvatar size="summary" name={svc.name} imageUrl={svc.imageUrl} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 min-w-0">
                          <p className="text-[13px] font-semibold text-ink leading-snug truncate">{toTitleCase(svc.name)}</p>
                          {svc.promo && <PromoTag promotionName={svc.promo.name} promotionType={svc.promo.discountType} promotionValue={svc.promo.discountValue} discountAmount={svc.promo.discountAmount} />}
                        </div>
                        <p className="text-xs text-ink-3 mt-0.5">{svc.duration} min</p>
                      </div>
                      {svc.promo
                        ? <StruckPrice original={formatServicePrice(svc)} final={formatServicePrice({ ...svc, price: svc.promo.finalPrice })} size="sm" />
                        : <p className="text-[13px] font-semibold text-gold tabular-nums shrink-0">{formatServicePrice(svc)}</p>
                      }
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <EntityAvatar size="summary" name={displayServices[0]?.name} imageUrl={displayServices[0]?.imageUrl} />
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-semibold uppercase tracking-widest text-ink-3 mb-0.5">Servicio</p>
                    <div className="flex items-center gap-2 min-w-0">
                      <p className="text-[14px] font-semibold text-ink leading-snug">{toTitleCase(displayServices[0]?.name)}</p>
                      {displayServices[0]?.promo && <PromoTag promotionName={displayServices[0].promo.name} promotionType={displayServices[0].promo.discountType} promotionValue={displayServices[0].promo.discountValue} discountAmount={displayServices[0].promo.discountAmount} />}
                    </div>
                    <p className="text-xs text-ink-3 mt-0.5">{displayServices[0]?.duration} min</p>
                  </div>
                  {displayServices[0]?.promo
                    ? <StruckPrice original={formatServicePrice(displayServices[0])} final={combinedPriceStr} size="md" />
                    : <p className="text-[14px] font-semibold text-gold tabular-nums shrink-0">{combinedPriceStr}</p>
                  }
                </div>
              )}
              <div className="flex items-center gap-3">
                <EntityAvatar size="summary" name={state.specialist?.name} imageUrl={state.specialist?.avatarUrl} />
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-widest text-ink-3">Especialista</p>
                  <p className="text-[13px] font-semibold text-ink">{toTitleCase(state.specialist?.name)}</p>
                </div>
              </div>
              {displayBranch?.name && (
                <div className="flex items-center gap-3">
                  <EntityAvatar size="summary" name={displayBranch.name} imageUrl={displayBranch.image_url} />
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-widest text-ink-3">Sucursal</p>
                    <p className="text-[13px] font-semibold text-ink">{toTitleCase(displayBranch.name)}</p>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Total row — con promo: lista tachada + total promocional + ahorro */}
        <div className="px-5 py-3.5 border-t border-edge flex items-center justify-between bg-raised/30">
          <span className="text-[13px] font-semibold text-ink">Total</span>
          {totalSavings > 0 ? (
            <div className="text-right">
              <StruckPrice original={originalCombinedStr} final={combinedPriceStr} size="xl" />
              <SavingsNote amount={totalSavings} promoName={promoNames} className="mt-0.5" />
            </div>
          ) : (
            <span className="text-[18px] font-bold text-gold tabular-nums">
              {combinedPriceStr}
            </span>
          )}
        </div>
      </div>

      {/* ── Aviso: la promo del catálogo ya no aplica para este cliente ──── */}
      {promoDropped && (
        <div className="mb-5 flex items-start gap-2.5 px-4 py-3 rounded-2xl bg-amber-500/8 border border-amber-500/25 animate-fade-up">
          <svg className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
          </svg>
          <p className="text-xs leading-relaxed text-amber-700 dark:text-amber-400">
            <span className="font-semibold">La promoción ya no está disponible para este número.</span>{' '}
            {serverPricing?.totalDiscount > 0
              ? 'El descuento se ajustó y el total de arriba ya lo refleja.'
              : 'Es posible que ya la hayas usado o que haya alcanzado su límite. El total de arriba muestra el precio regular.'}
          </p>
        </div>
      )}

      {/* ── Política de cancelación (UX-1) ─────────────────────────────── */}
      {config?.cancellation_policy && !otpPhase && (
        <div className="mb-5 px-4 py-4 rounded-2xl border border-edge bg-raised/30">
          <p className="text-[11px] font-bold uppercase tracking-widest text-ink-3 mb-1.5">Política de cancelación</p>
          <p className="text-[13px] text-ink-2 leading-relaxed">{config.cancellation_policy}</p>
        </div>
      )}

      {/* ── Client form / OTP panel ──────────────────────────────────────── */}
      {otpPhase ? (
        <OTPPanel
          key={otpKey}
          phone={phone}
          loading={submitting}
          error={otpError}
          resendCooldown={resendCooldown}
          onVerify={handleVerifyOTP}
          onResend={handleResendOTP}
          onBack={() => setOtpPhase(false)}
        />
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div className="grid grid-cols-2 gap-3">
            <Input
              id="client-first-name"
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
              id="client-last-name"
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
            id="client-phone"
            label="Teléfono"
            placeholder="55 1234 5678"
            value={phone}
            onChange={e => { setPhone(e.target.value); if (errors.phone) setErrors(p => ({ ...p, phone: null })); }}
            onBlur={e => { const err = phoneErr(e.target.value); if (err) setErrors(p => ({ ...p, phone: err })); }}
            error={errors.phone}
            required
            autoComplete="tel"
            helper="10 dígitos (asegúrate de incluir la lada)"
          />
          <Input
            id="client-email"
            label="Correo electrónico"
            placeholder="tu@correo.com"
            value={email}
            onChange={e => { setEmail(e.target.value); if (errors.email) setErrors(p => ({ ...p, email: null })); }}
            onBlur={e => { const err = emailErr(e.target.value); if (err) setErrors(p => ({ ...p, email: err })); }}
            error={errors.email}
            autoComplete="email"
            type="email"
            maxLength={120}
            helper="Opcional · Recibirás confirmación y recordatorios"
          />
          {/* ── Código promocional (colapsable) ──────────────────────────── */}
          {promoEnabled && (
            <div className="pt-1">
              {!promoOpen && !appliedCode ? (
                <button
                  type="button"
                  onClick={() => setPromoOpen(true)}
                  className="text-[13px] font-medium text-gold hover:text-gold/80 transition-colors inline-flex items-center gap-1.5"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M7 7h.01M3 3h7.5a2 2 0 011.414.586l7.5 7.5a2 2 0 010 2.828l-5.086 5.086a2 2 0 01-2.828 0l-7.5-7.5A2 2 0 013 10.5V3z" />
                  </svg>
                  ¿Tienes un código promocional?
                </button>
              ) : appliedCode ? (
                <div className="flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-2xl bg-gold/8 border border-gold/25">
                  <div className="flex items-center gap-2 min-w-0">
                    <svg className="w-4 h-4 text-gold shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div className="min-w-0">
                      <p className="text-[13px] font-bold text-ink tabular-nums tracking-wider truncate">{appliedCode}</p>
                      {promoStatus?.message && <p className="text-[12px] text-ink-3 truncate">{promoStatus.message}</p>}
                    </div>
                  </div>
                  <button type="button" onClick={clearPromo} className="text-[12px] font-semibold text-ink-3 hover:text-ink transition-colors shrink-0">
                    Quitar
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  <label className="block text-[12px] font-medium text-ink-2">Código promocional</label>
                  <div className="flex gap-2">
                    <Input
                      value={promoInput}
                      onChange={e => { setPromoInput(e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, '')); if (promoStatus) setPromoStatus(null); }}
                      onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleApplyPromo(); } }}
                      maxLength={24}
                      placeholder="Ej. VERANO20"
                      autoComplete="off"
                      spellCheck={false}
                      error={promoStatus && !promoStatus.ok ? promoStatus.message : undefined}
                      className="flex-1 font-semibold tracking-wider uppercase"
                    />
                    <Button type="button" variant="subtle" onClick={handleApplyPromo} loading={promoChecking} disabled={!promoInput.trim()} className="shrink-0">
                      Aplicar
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}

          <p className="text-[11px] text-ink-3 leading-relaxed">
            Tus datos se usan para gestionar tu cita con {businessName} (confirmaciones, recordatorios y, si aplica, verificación por código). Más información en el{' '}
            <a href="https://cita24.com/privacidad" target="_blank" rel="noopener noreferrer" className="underline hover:text-ink-2">
              Aviso de Privacidad
            </a>.
          </p>

          <Button type="submit" size="lg" className="w-full mt-2" loading={isPending || submitting}>
            Confirmar reservación
          </Button>
        </form>
      )}
    </div>
  );
}
