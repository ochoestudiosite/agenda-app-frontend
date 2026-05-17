const BASE = `${import.meta.env.VITE_API_URL || ''}/api`;

// Reserved labels that are never a tenant — must mirror backend tenantResolver.
const RESERVED_SUBDOMAINS = new Set(['www', 'api', 'app', 'admin', 'mail', 'smtp', 'ftp', 'saas']);

// Extract the tenant slug strictly from the configured PUBLIC_DOMAIN. Refuses
// to guess from arbitrary hostnames — if the request is on the wrong host
// (preview deploy, Railway URL, IP, localhost, etc.) we send no slug and let
// the server's other resolution paths (subdomain on the API host, env var)
// handle it. This prevents accidentally treating something like
// "staging.barberpro.cita24.com" as tenant="staging".
function getTenantSlug() {
  const publicDomain = (import.meta.env.VITE_PUBLIC_DOMAIN || 'cita24.com').toLowerCase();
  const host = window.location.hostname.toLowerCase();
  if (!host.endsWith(`.${publicDomain}`)) return null;

  const sub = host.slice(0, host.length - publicDomain.length - 1);
  // Reject empty, deep subdomains (sub.sub.cita24.com) and reserved labels.
  if (!sub || sub.includes('.') || RESERVED_SUBDOMAINS.has(sub)) return null;
  return sub;
}

const sleep = (ms) => new Promise(res => setTimeout(res, ms));

async function request(method, path, body, retryCount = 0) {
  const slug = getTenantSlug();
  const headers = {};
  const MAX_RETRIES = 2;

  if (body) headers['Content-Type'] = 'application/json';
  if (slug) headers['X-Tenant-Slug'] = slug;

  try {
    const res = await fetch(`${BASE}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      const err = new Error(data.message || data.error || `HTTP ${res.status}`);
      err.status = res.status;
      err.code   = data.error; // preserve server error code for specific handling
      throw err;
    }

    return data;
  } catch (error) {
    // Never retry HTTP error responses — the server already processed the request
    // deterministically. Retrying would just repeat the same result.
    // Only retry genuine network failures (no .status property).
    if (error.status) throw error;
    if (retryCount < MAX_RETRIES) {
      await sleep(1000 * (retryCount + 1));
      return request(method, path, body, retryCount + 1);
    }
    throw error;
  }
}

export const api = {
  getConfig:   () => request('GET', '/config'),
  getServices: () => request('GET', '/services'),
  getSpecialists: () => request('GET', '/services/specialists'),
  getAvailability: (date, specialistId) => request('GET', `/availability?date=${date}${specialistId ? `&specialistId=${specialistId}` : ''}`),
  getBlockedDates: (month, specialistId) => request('GET', `/availability/blocked-dates?month=${month}${specialistId ? `&specialistId=${specialistId}` : ''}`),
  createAppointment: (body) => request('POST', '/appointments', body),
  getAppointment: (code) => request('GET', `/appointments/${code}`),
  rescheduleAppointment: (code, body) => request('PUT', `/appointments/${code}`, body),
  cancelAppointment: (code) => request('DELETE', `/appointments/${code}`),
};
