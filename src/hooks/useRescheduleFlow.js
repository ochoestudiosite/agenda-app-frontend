import { useState, useRef, useEffect } from 'react';

export function useRescheduleFlow({
  phoneVerificationRequired,
  rescheduleMutation,
  requestOtpFn,
  onSuccess,
  onOtpReady,
  toastFn,
  successMessage = 'Cita reagendada correctamente.',
}) {
  const [isPending,      setIsPending]      = useState(false);
  const [otpPending,     setOtpPending]     = useState(false);
  const [otpPhone,       setOtpPhone]       = useState(null);
  const [otpPendingId,   setOtpPendingId]   = useState(null);
  const [otpKey,         setOtpKey]         = useState(0);
  const [otpError,       setOtpError]       = useState(null);
  const [resendCooldown, setResendCooldown] = useState(0);

  const pendingDataRef      = useRef(null);
  const submitInFlightRef   = useRef(false);
  const resendInFlightRef   = useRef(false);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setInterval(() => setResendCooldown(c => Math.max(0, c - 1)), 1000);
    return () => clearInterval(t);
  }, [resendCooldown]);

  async function initiateReschedule(rescheduleData) {
    if (submitInFlightRef.current) return;
    submitInFlightRef.current = true;
    if (!phoneVerificationRequired) {
      setIsPending(true);
      try {
        const updated = await rescheduleMutation.mutateAsync(rescheduleData);
        toastFn(successMessage, 'success');
        if (updated?.promoRemovedOnReschedule) {
          toastFn('La promoción aplicada ya no es válida para el nuevo horario y fue removida.', 'info');
        }
        onSuccess(updated);
      } catch (err) {
        toastFn(err.message || 'Error al reagendar.', 'error');
      } finally {
        setIsPending(false);
        submitInFlightRef.current = false;
      }
      return;
    }

    pendingDataRef.current = rescheduleData;
    setIsPending(true);
    setOtpError(null);
    try {
      const { pendingId, maskedPhone } = await requestOtpFn();
      setOtpPendingId(pendingId);
      setOtpPhone(maskedPhone);
      setOtpKey(k => k + 1);
      setResendCooldown(60);
      setOtpPending(true);
      onOtpReady?.();
    } catch (err) {
      toastFn(err.message || 'Error al enviar el código.', 'error');
    } finally {
      setIsPending(false);
      submitInFlightRef.current = false;
    }
  }

  async function handleOtpVerify(otpCode) {
    if (!pendingDataRef.current) return;
    setIsPending(true);
    setOtpError(null);
    try {
      const updated = await rescheduleMutation.mutateAsync({
        ...pendingDataRef.current,
        pendingId: otpPendingId,
        otpCode,
      });
      toastFn(successMessage, 'success');
      if (updated?.promoRemovedOnReschedule) {
        toastFn('La promoción aplicada ya no es válida para el nuevo horario y fue removida.', 'info');
      }
      setOtpPending(false);
      onSuccess(updated);
    } catch (err) {
      setOtpError(err.message || 'Código incorrecto. Intenta de nuevo.');
      setOtpKey(k => k + 1);
    } finally {
      setIsPending(false);
    }
  }

  async function handleResend() {
    if (resendCooldown > 0 || isPending || resendInFlightRef.current) return;
    resendInFlightRef.current = true;
    setIsPending(true);
    try {
      const { pendingId, maskedPhone } = await requestOtpFn();
      setOtpPendingId(pendingId);
      setOtpPhone(maskedPhone);
      setOtpKey(k => k + 1);
      setResendCooldown(60);
      setOtpError(null);
    } catch (err) {
      setOtpError(err.message || 'Error al reenviar.');
      setResendCooldown(15);
    } finally {
      resendInFlightRef.current = false;
      setIsPending(false);
    }
  }

  function resetOtp() {
    setOtpError(null);
    setOtpPending(false);
  }

  return {
    initiateReschedule,
    handleOtpVerify,
    handleResend,
    resetOtp,
    isPending,
    otpPending,
    otpPhone,
    otpKey,
    otpError,
    resendCooldown,
  };
}
