// Client-side error reporter — sends uncaught JS errors to the platform monitoring system.
// Only active in production builds. Self-rate-limits and deduplicates to avoid noise.

const API_URL  = import.meta.env.VITE_API_URL || '';
const APP_NAME = 'frontend';
const IS_PROD  = import.meta.env.PROD;

let _count = 0;
setInterval(() => { _count = 0; }, 60_000);
const _seen = new Set();

// Booking frontend: parse tenant slug from subdomain (e.g. "clinica.cita24.com" → "clinica")
function getTenantSlug() {
  try {
    const parts = window.location.hostname.split('.');
    if (parts.length >= 3 && window.location.hostname.endsWith('.cita24.com')) {
      return parts[0];
    }
  } catch {}
  return null;
}

export function reportError({ type = 'js_error', message, stack, component } = {}) {
  if (!IS_PROD || !message) return;

  const key = `${type}|${String(message).slice(0, 120)}`;
  if (_seen.has(key)) return;
  if (_count >= 5)    return;
  _seen.add(key);
  _count++;

  const payload = {
    type,
    appName:    APP_NAME,
    message:    String(message).slice(0, 1000),
    stack:      stack     ? String(stack).slice(0, 5000) : undefined,
    component:  component ? String(component).slice(0, 200) : undefined,
    url:        window.location.pathname,
    tenantSlug: getTenantSlug() || undefined,
  };

  try {
    fetch(`${API_URL}/api/errors/client`, {
      method:    'POST',
      headers:   { 'Content-Type': 'application/json' },
      body:      JSON.stringify(payload),
      keepalive: true,
    }).catch(() => {});
  } catch {
    try {
      navigator.sendBeacon(
        `${API_URL}/api/errors/client`,
        new Blob([JSON.stringify(payload)], { type: 'application/json' }),
      );
    } catch {}
  }
}

export function initErrorReporter() {
  if (!IS_PROD) return;

  window.addEventListener('error', (event) => {
    reportError({
      type:    'js_error',
      message: event.message || 'Unknown error',
      stack:   event.error?.stack,
    });
  });

  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason;
    reportError({
      type:    'unhandled_rejection',
      message: reason instanceof Error ? reason.message : String(reason ?? 'Unhandled rejection'),
      stack:   reason instanceof Error ? reason.stack : undefined,
    });
  });
}
