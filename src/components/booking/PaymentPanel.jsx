import { useState, useEffect, useMemo, useRef } from 'react';
import { AlertCircle, CreditCard, Loader2, ChevronLeft } from 'lucide-react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { api } from '../../services/api';
import { formatPriceFromCents } from '../../utils/formatters';
import Spinner from '../ui/Spinner';

// loadStripe() must be called at most once per (publishable key, connected
// account) pair — Stripe.js warns (and wastes a network round-trip) if it's
// re-invoked on every render/remount. Cached at module scope so it survives
// the whole SPA session, not just this component's lifetime.
const stripePromiseCache = new Map();
function getStripePromise(publishableKey, accountId) {
  const key = `${publishableKey}::${accountId || ''}`;
  if (!stripePromiseCache.has(key)) {
    stripePromiseCache.set(key, loadStripe(publishableKey, accountId ? { stripeAccount: accountId } : undefined));
  }
  return stripePromiseCache.get(key);
}

// Stripe Elements appearance uses literal color values (not CSS var()
// references), so the tenant's live brand tokens — which BrandTokensApplier
// writes onto :root as "R G B" — are read once at mount and converted here.
function rgbVarParts(name, fallbackParts) {
  if (typeof window === 'undefined' || typeof document === 'undefined') return fallbackParts;
  const raw = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  if (!raw) return fallbackParts;
  const parts = raw.split(/\s+/).map(Number);
  if (parts.length !== 3 || parts.some(Number.isNaN)) return fallbackParts;
  return parts;
}
const rgbStr  = parts => `rgb(${parts.join(' ')})`;
const rgbaStr = (parts, a) => `rgba(${parts.join(', ')}, ${a})`;

function buildAppearance() {
  const goldParts = rgbVarParts('--gold', [120, 120, 128]);
  const edgeParts = rgbVarParts('--edge', [209, 209, 214]);
  return {
    theme: 'stripe',
    variables: {
      colorPrimary:       rgbStr(goldParts),
      colorBackground:    rgbStr(rgbVarParts('--card', [255, 255, 255])),
      colorText:          rgbStr(rgbVarParts('--ink', [29, 29, 31])),
      colorTextSecondary: rgbStr(rgbVarParts('--ink-2', [99, 99, 102])),
      colorDanger:        '#ef4444',
      fontFamily:         'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
      fontSizeBase:       '15px',
      borderRadius:       '12px',
      spacingUnit:        '4px',
    },
    rules: {
      '.Input':         { border: `1px solid ${rgbStr(edgeParts)}`, boxShadow: 'none' },
      '.Input:focus':   { border: `1px solid ${rgbStr(goldParts)}`, boxShadow: `0 0 0 3px ${rgbaStr(goldParts, 0.18)}` },
      '.Label':         { fontWeight: '500', color: rgbStr(rgbVarParts('--ink-2', [99, 99, 102])) },
      '.Tab':           { border: `1px solid ${rgbStr(edgeParts)}` },
      '.Tab--selected': { border: `1px solid ${rgbStr(goldParts)}` },
    },
  };
}

function msRemaining(expiresAt) {
  const t = new Date(expiresAt).getTime();
  if (Number.isNaN(t)) return 0;
  return t - Date.now();
}

function formatCountdown(ms) {
  const totalSecs = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(totalSecs / 60);
  const s = totalSecs % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

// Poll cadence for post-payment confirmation (webhook lands async):
// fast for the first ~20s, then slower while reassuring the client their
// money was already taken, up to an outer ceiling before pointing them to
// "Gestionar" instead of polling forever.
const POLL_FAST_MS       = 2000;
const POLL_SLOW_MS       = 5000;
const POLL_SWITCH_AFTER  = 20_000;
const POLL_GIVE_UP_AFTER = 2 * 60_000;

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

export default function PaymentPanel({ payment, paymentConfig, code, onConfirmed, onBack, onBusyChange }) {
  const [remainingMs, setRemainingMs] = useState(() => msRemaining(payment.expires_at));
  // El countdown es solo un reloj — no sabe si ya hay una confirmación REAL en
  // curso (confirmPayment ya se disparó, o el poll post-pago está corriendo).
  // Sin este guard, el countdown llegando a 0 desmonta el formulario a mitad
  // de una confirmación exitosa y muestra "expiró" seguido, segundos después,
  // de un salto incoherente a "confirmada" (hallazgo de auditoría 2026-07-21).
  const [childBusy, setChildBusy] = useState(false);
  const expired = remainingMs <= 0 && !childBusy;

  useEffect(() => {
    if (remainingMs <= 0) return;
    const id = setInterval(() => setRemainingMs(msRemaining(payment.expires_at)), 1000);
    return () => clearInterval(id);
  }, [payment.expires_at, remainingMs]);

  // Guard: paymentConfig can theoretically arrive as null if the /config
  // endpoint returns payments:null (e.g. missing STRIPE_PUBLISHABLE_KEY env)
  // while the creation endpoint already returned a payment block. The early
  // return below makes this safe; the useMemo must also use optional chaining
  // so it doesn't throw before that return is reached.
  const stripePromise = useMemo(
    () => paymentConfig
      ? getStripePromise(paymentConfig.publishable_key, paymentConfig.stripe_account_id)
      : null,
    [paymentConfig?.publishable_key, paymentConfig?.stripe_account_id],
  );
  const appearance = useMemo(() => buildAppearance(), []);

  function handleChildBusyChange(busy) {
    setChildBusy(busy);
    onBusyChange?.(busy);
  }

  // Stripe config unavailable — surface a clear error instead of crashing.
  if (!paymentConfig) {
    return (
      <div className="card p-5 sm:p-6 animate-fade-in text-center">
        <p className="text-[15px] font-semibold text-ink mb-1">No se pudo inicializar el pago</p>
        <p className="text-[13px] text-ink-3 mb-5">Hubo un problema de configuración. Vuelve a intentarlo o contacta al negocio.</p>
        <button
          type="button"
          onClick={onBack}
          className="w-full py-3 rounded-xl text-[13px] font-semibold bg-gold text-on-gold hover:bg-gold-light transition-colors duration-150 cursor-pointer"
        >
          Volver
        </button>
      </div>
    );
  }

  if (expired) {
    return (
      <div className="card p-5 sm:p-6 animate-fade-in text-center">
        <div className="w-12 h-12 mx-auto rounded-xl bg-red-500/8 border border-red-400/25 flex items-center justify-center mb-4">
          <AlertCircle className="w-5 h-5 text-red-500" strokeWidth={1.75} />
        </div>
        <p className="text-[15px] font-semibold text-ink mb-1">El tiempo para pagar expiró</p>
        <p className="text-[13px] text-ink-3 mb-5">Tu lugar fue liberado. Elige un nuevo horario para continuar.</p>
        <button
          type="button"
          onClick={onBack}
          className="w-full py-3 rounded-xl text-[13px] font-semibold bg-gold text-on-gold hover:bg-gold-light transition-colors duration-150 cursor-pointer"
        >
          Elegir otro horario
        </button>
      </div>
    );
  }

  return (
    <div className="card p-5 sm:p-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-3 mb-5">
        <div className="w-10 h-10 rounded-xl bg-gold/10 border border-gold/20 flex items-center justify-center shrink-0">
          <CreditCard className="w-4.5 h-4.5 text-gold" strokeWidth={1.75} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[15px] font-semibold text-ink leading-tight">Completa tu pago</p>
          <p className="text-[13px] text-ink-3 mt-0.5 leading-tight">
            Tu lugar está reservado por{' '}
            <span className="font-mono font-semibold text-gold tabular-nums">{formatCountdown(remainingMs)}</span>
          </p>
        </div>
      </div>

      <Elements stripe={stripePromise} options={{ clientSecret: payment.client_secret, appearance, locale: 'es' }}>
        <PaymentForm amountCents={payment.amount_cents} code={code} onConfirmed={onConfirmed} onBack={onBack} onBusyChange={handleChildBusyChange} />
      </Elements>
    </div>
  );
}

function PaymentForm({ amountCents, code, onConfirmed, onBack, onBusyChange }) {
  const stripe   = useStripe();
  const elements = useElements();
  const [submitting, setSubmitting]         = useState(false);
  const [confirming, setConfirming]         = useState(false);
  const [confirmingSlow, setConfirmingSlow] = useState(false);
  const [error, setError]                   = useState(null);
  const [intentExpired, setIntentExpired]   = useState(false);

  // Sin esto, un poll que sigue corriendo tras desmontar (usuario navegó,
  // cerró el panel, o el padre lo reemplazó) termina llamando onConfirmed()/
  // setError() sobre un componente fantasma — en el mejor caso un warning de
  // React, en el peor un salto de pantalla que el usuario nunca pidió.
  const mountedRef = useRef(true);
  useEffect(() => () => { mountedRef.current = false; }, []);

  useEffect(() => {
    onBusyChange?.(submitting || confirming);
  }, [submitting, confirming, onBusyChange]);

  async function pollForConfirmation() {
    const startedAt = Date.now();
    for (;;) {
      if (!mountedRef.current) return;
      try {
        const appt = await api.getAppointment(code);
        if (!mountedRef.current) return;
        if (appt.status === 'confirmed') {
          onConfirmed();
          return;
        }
        if (appt.status === 'cancelled' || appt.status === 'payment_expired') {
          setError(`Tu pago se procesó, pero no pudimos confirmar tu cita automáticamente. Guarda tu código ${code} y contacta al negocio.`);
          setConfirming(false);
          return;
        }
      } catch { /* transient network hiccup — keep polling, never surface as a payment failure */ }

      const elapsed = Date.now() - startedAt;
      if (elapsed > POLL_GIVE_UP_AFTER) {
        if (mountedRef.current) {
          setError(`Tu pago se realizó con éxito. La confirmación está tardando más de lo normal — revisa "Gestionar" en unos minutos con tu código ${code}.`);
          setConfirming(false);
        }
        return;
      }
      if (elapsed > POLL_SWITCH_AFTER && mountedRef.current) setConfirmingSlow(true);
      await sleep(elapsed > POLL_SWITCH_AFTER ? POLL_SLOW_MS : POLL_FAST_MS);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!stripe || !elements || submitting || confirming) return;
    setSubmitting(true);
    setError(null);

    let stripeError;
    try {
      ({ error: stripeError } = await stripe.confirmPayment({ elements, redirect: 'if_required' }));
    } catch {
      // confirmPayment normalmente RESUELVE con {error} para fallos manejados
      // (tarjeta rechazada, etc.) — si en cambio LANZA (red caída a mitad de
      // la llamada, error inesperado del SDK), sin este catch el botón se
      // quedaba en "Procesando…" para siempre, sin mensaje y sin salida.
      if (mountedRef.current) {
        setSubmitting(false);
        setError('No se pudo conectar con Stripe para procesar tu pago. Revisa tu conexión e intenta de nuevo.');
      }
      return;
    }

    if (stripeError) {
      if (!mountedRef.current) return;
      setSubmitting(false);
      // 'invalid_request_error' (p. ej. payment_intent_unexpected_state) significa
      // que el PaymentIntent ya no es confirmable del lado de Stripe — típicamente
      // porque el job de expiración (TTL 15 min) ya lo canceló server-side mientras
      // el reloj local del cliente todavía mostraba segundos positivos (drift).
      // Reintentar es inútil: solo "elegir otro horario" saca al cliente del bucle.
      if (stripeError.type === 'invalid_request_error') {
        setIntentExpired(true);
        setError('Tu sesión de pago ya no es válida — probablemente expiró justo antes de confirmar. Elige tu horario de nuevo para continuar.');
      } else {
        setError(stripeError.message || 'No se pudo procesar tu pago. Verifica tus datos e intenta de nuevo.');
      }
      return;
    }

    setSubmitting(false);
    setConfirming(true);
    await pollForConfirmation();
  }

  const busy = submitting || confirming;

  if (intentExpired) {
    return (
      <div className="space-y-4">
        <p className="text-[13px] text-red-500 flex items-start gap-1.5" role="alert">
          <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          {error}
        </p>
        <button
          type="button"
          onClick={onBack}
          className="w-full py-3 rounded-xl text-[13px] font-semibold bg-gold text-on-gold hover:bg-gold-light transition-colors duration-150 cursor-pointer"
        >
          Elegir otro horario
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      <PaymentElement options={{ layout: 'tabs' }} />

      {error && (
        <p className="text-[13px] text-red-500 flex items-start gap-1.5" role="alert">
          <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          {error}
        </p>
      )}

      {confirming ? (
        <div className="flex items-center justify-center gap-2.5 py-3.5" aria-live="polite">
          <Spinner size="sm" />
          <span className="text-[13px] text-ink-3">
            {confirmingSlow ? 'Tu pago fue exitoso — confirmando tu cita…' : 'Confirmando tu pago…'}
          </span>
        </div>
      ) : (
        <button
          type="submit"
          disabled={!stripe || !elements || submitting}
          className="w-full min-h-[52px] inline-flex items-center justify-center gap-2 rounded-xl text-[0.9375rem] font-medium
                     bg-gold text-on-gold hover:bg-gold-light shadow-xs hover:shadow-card
                     transition-all duration-160 ease-spring cursor-pointer active:scale-[0.97]
                     disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {submitting && (
            <Loader2 className="animate-spin h-4 w-4 shrink-0" />
          )}
          {submitting ? 'Procesando…' : `Pagar ${formatPriceFromCents(amountCents)}`}
        </button>
      )}

      {!busy && (
        <button
          type="button"
          onClick={onBack}
          className="w-full py-2 flex items-center justify-center gap-1.5 rounded-xl text-[13px] text-ink-3 hover:text-ink transition-colors duration-150 hover:bg-raised/70 cursor-pointer"
        >
          <ChevronLeft className="w-3.5 h-3.5 shrink-0" />
          Cancelar y elegir otro horario
        </button>
      )}
    </form>
  );
}
