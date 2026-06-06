// postMessage origin allowlist — mirrors backend CORS policy.
// Allows: localhost in dev, exact PUBLIC_DOMAIN, and single-level subdomains.
// Deep subdomains (sub.sub.domain) are explicitly rejected.
export function isAllowedAdminOrigin(origin) {
  if (!origin || typeof origin !== 'string') return false;
  if (origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:')) return true;

  const publicDomain = (import.meta.env.VITE_PUBLIC_DOMAIN || 'cita24.com').toLowerCase();
  try {
    const url = new URL(origin);
    if (url.protocol !== 'https:') return false;
    const host = url.hostname.toLowerCase();
    if (host === publicDomain) return true;
    if (!host.endsWith(`.${publicDomain}`)) return false;
    // Reject deep subdomains (sub.sub.cita24.com)
    const sub = host.slice(0, -(publicDomain.length + 1));
    return sub.length > 0 && !sub.includes('.');
  } catch {
    return false;
  }
}
