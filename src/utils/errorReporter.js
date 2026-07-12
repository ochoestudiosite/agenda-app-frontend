// Client-side error reporter — sends uncaught JS errors to the platform monitoring system.
// Only active in production builds. Self-rate-limits and deduplicates to avoid noise.

// Chunk errors (deploy nuevo invalidó los hashes): detección y auto-reload
// centralizados en chunkGuard — misma fuente de verdad que el ErrorBoundary.
import { isChunkLoadError, attemptChunkReload } from './chunkGuard';

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
  } catch { /* URL parse error */ }
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
  } catch { /* fire-and-forget */
    try {
      navigator.sendBeacon(
        `${API_URL}/api/errors/client`,
        new Blob([JSON.stringify(payload)], { type: 'application/json' }),
      );
    } catch { /* intentional */ }
  }
}

let _reloadBannerShown = false;
function showReloadBanner() {
  if (_reloadBannerShown) return;
  _reloadBannerShown = true;
  const bar = document.createElement('div');
  bar.setAttribute('role', 'alert');
  bar.style.cssText = [
    'position:fixed;bottom:0;left:0;right:0;z-index:9999',
    'background:#111827;color:#F9FAFB;padding:14px 20px',
    'display:flex;align-items:center;justify-content:space-between;gap:16px',
    'font-family:-apple-system,"Inter",sans-serif;font-size:13px',
    'border-top:1px solid #374151',
  ].join(';');
  bar.innerHTML = `
    <span style="display:inline-flex;align-items:center;gap:6px;"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M16.023 9.348h4.992V4.356M2.985 19.644v-4.992h4.992m-4.026 0a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99"/></svg><strong>Nueva versión disponible.</strong> Recarga para continuar.</span>
    <button onclick="window.location.reload()" style="
      background:rgb(var(--gold));color:rgb(var(--on-gold));border:none;border-radius:9999px;
      padding:7px 18px;font-size:12px;font-weight:700;cursor:pointer;
      font-family:inherit;white-space:nowrap;
    ">Recargar</button>
  `;
  document.body.appendChild(bar);
}

export function initErrorReporter() {
  if (!IS_PROD) return;

  window.addEventListener('error', (event) => {
    const msg = event.message || 'Unknown error';
    // Artefacto de deploy: reload transparente; banner solo si el anti-bucle
    // lo bloqueó. No se reporta (misma decisión que en ErrorBoundary).
    if (isChunkLoadError(msg)) { if (!attemptChunkReload()) showReloadBanner(); return; }
    reportError({ type: 'js_error', message: msg, stack: event.error?.stack });
  });

  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason;
    const msg = reason instanceof Error ? reason.message : String(reason ?? 'Unhandled rejection');
    if (isChunkLoadError(msg)) { if (!attemptChunkReload()) showReloadBanner(); return; }
    reportError({ type: 'unhandled_rejection', message: msg, stack: reason instanceof Error ? reason.stack : undefined });
  });
}
