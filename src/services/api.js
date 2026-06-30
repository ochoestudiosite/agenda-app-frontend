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

// Returns the current hostname when it is a tenant-owned custom domain
// (not a *.cita24.com subdomain and not localhost). The backend resolves
// the tenant from this header via its verified custom domain registry.
function getCustomDomain() {
  const publicDomain = (import.meta.env.VITE_PUBLIC_DOMAIN || 'cita24.com').toLowerCase();
  const host = window.location.hostname.toLowerCase();
  if (!host || host === 'localhost' || host === '127.0.0.1') return null;
  if (host === publicDomain || host.endsWith(`.${publicDomain}`)) return null;
  return host; // e.g. 'belleza.ocheostudio.site'
}

const sleep = (ms) => new Promise(res => setTimeout(res, ms));

const TIMEOUT_MS = 15_000;

async function request(method, path, body, retryCount = 0, options = {}) {
  const slug        = getTenantSlug();
  const customDomain = getCustomDomain();
  const headers = {};
  const MAX_RETRIES = 2;

  if (body) headers['Content-Type'] = 'application/json';
  if (slug)         headers['X-Tenant-Slug']   = slug;
  else if (customDomain) headers['X-Tenant-Domain'] = customDomain;

  const controller = new AbortController();
  const timeoutId  = setTimeout(() => controller.abort(), TIMEOUT_MS);

  if (options.signal) {
    options.signal.addEventListener('abort', () => controller.abort(), { once: true });
  }

  try {
    const res = await fetch(`${BASE}${path}`, {
      method,
      headers,
      body:   body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      const err = new Error(data.message || data.error || `HTTP ${res.status}`);
      err.status = res.status;
      err.code   = data.error; // preserve server error code for specific handling
      throw err;
    }

    return data;
  } catch (error) {
    clearTimeout(timeoutId);
    // Never retry HTTP error responses — the server already processed the request
    // deterministically. Retrying would just repeat the same result.
    // Only retry genuine network failures (no .status property).
    if (error.status) throw error;
    if (error.name === 'AbortError') {
      // Distinguish external cancellation (React Query unmount) from our timeout.
      if (options.signal?.aborted) {
        const cancelErr = new Error('Request cancelled');
        cancelErr.code = 'CANCELLED';
        throw cancelErr;
      }
      const timeoutErr = new Error('La solicitud tardó demasiado. Verifica tu conexión.');
      timeoutErr.code = 'TIMEOUT';
      throw timeoutErr;
    }
    // Never blindly retry non-idempotent mutations on a network failure: the
    // server may have already committed the write (e.g. created the cita)
    // before the response was lost, and a retry would duplicate it.
    if (method === 'GET' && retryCount < MAX_RETRIES) {
      await sleep(1000 * (retryCount + 1));
      return request(method, path, body, retryCount + 1, options);
    }
    throw error;
  }
}

export const api = {
  getConfig:      (options = {}) => request('GET', '/config', null, 0, options),
  getServices:    (options = {}) => request('GET', '/services', null, 0, options),
  getSpecialists: (options = {}) => request('GET', '/services/specialists', null, 0, options),
  getGroupAvailability: (date, assignments, branchId, excludeCodes, options = {}) => {
    // assignments = [{serviceId, specialistId}]
    const assignmentsParam = assignments.map(a => `${a.serviceId}:${a.specialistId}`).join(',');
    const p = new URLSearchParams({ date, assignments: assignmentsParam });
    if (branchId) p.set('branchId', String(branchId));
    if (excludeCodes?.length) p.set('excludeCodes', excludeCodes.join(','));
    return request('GET', `/availability/group?${p}`, null, 0, options);
  },
  createGroupAppointment: (body) => request('POST', '/appointments/group', body),
  getGroupAppointment: (code, options = {}) => request('GET', `/appointments/group/${code}`, null, 0, options),
  rescheduleGroupAppointment: (code, body) => request('PUT', `/appointments/group/${code}`, body),
  cancelGroupAppointment:     (code, body) => request('DELETE', `/appointments/group/${code}`, body),
  getAvailability: (date, specialistId, branchId, serviceId, excludeCode, serviceIds, options = {}) => {
    const p = new URLSearchParams({ date });
    if (specialistId) p.set('specialistId', specialistId);
    if (branchId)     p.set('branchId', String(branchId));
    if (serviceIds)   p.set('serviceIds', serviceIds);
    else if (serviceId) p.set('serviceId', serviceId);
    if (excludeCode)  p.set('excludeCode', excludeCode);
    return request('GET', `/availability?${p}`, null, 0, options);
  },
  getBlockedDates: (month, specialistId, branchId, specialistIds, options = {}) => {
    const p = new URLSearchParams({ month });
    if (specialistIds)      p.set('specialistIds', specialistIds);
    else if (specialistId)  p.set('specialistId', specialistId);
    if (branchId) p.set('branchId', String(branchId));
    return request('GET', `/availability/blocked-dates?${p}`, null, 0, options);
  },
  requestOTP:          (body) => request('POST', '/appointments/request-otp', body),
  confirmOTP:          (body) => request('POST', '/appointments/confirm-otp', body),
  validatePromo:       (body) => request('POST', '/appointments/validate-promo', body),
  requestManageOTP:    (body) => request('POST', '/appointments/request-manage-otp', body),
  createAppointment:   (body) => request('POST', '/appointments', body),
  getAppointment:      (code, options = {}) => request('GET', `/appointments/${code}`, null, 0, options),
  rescheduleAppointment: (code, body) => request('PUT', `/appointments/${code}`, body),
  cancelAppointment:   (code, body) => request('DELETE', `/appointments/${code}`, body),
};
