import { useState, useRef, useEffect } from 'react';

export function useCancelFlow({
  phoneVerificationRequired,
  cancelMutation,
  requestOtpFn,
  onSuccess,
  onOtpReady,
  toastFn,
  successMessage = 'Cita cancelada.',
}) {
  const [isPending,      setIsPending]      = useState(false);
  const [otpPending,     setOtpPending]     = useState(false);
  const [otpPhone,       setOtpPhone]       = useState(null);
  const [otpPendingId,   setOtpPendingId]   = useState(null);
  const [otpKey,         setOtpKey]         = useState(0);
  const [otpError,       setOtpError]       = useState(null);
  const [resendCooldown, setResendCooldown] = useState(0);

  const submitInFlightRef = useRef(false);
  const resendInFlightRef = useRef(false);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setInterval(() => setResendCooldown(c => Math.max(0, c - 1)), 1000);
    return () => clearInterval(t);
  }, [resendCooldown]);

  async function initiateCancel(cancelData) {
    if (submitInFlightRef.current) return;
    submitInFlightRef.current = true;
    if (!phoneVerificationRequired) {
      setIsPending(true);
      try {
        const updated = await cancelMutation.mutateAsync(cancelData);
        toastFn(successMessage, 'info');
        onSuccess(updated);
      } catch (err) {
        toastFn(err.message || 'Error al cancelar.', 'error');
      } finally {
        setIsPending(false);
        submitInFlightRef.current = false;
      }
      return;
    }

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

  async function handleOtpVerify(otpCode, cancelData) {
    setIsPending(true);
    setOtpError(null);
    try {
      const updated = await cancelMutation.mutateAsync({
        ...cancelData,
        pendingId: otpPendingId,
        otpCode,
      });
      toastFn(successMessage, 'info');
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
    initiateCancel,
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
