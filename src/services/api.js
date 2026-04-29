const BASE = `${import.meta.env.VITE_API_URL || ''}/api`;

async function request(method, path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : {},
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const err = new Error(data.error || `HTTP ${res.status}`);
    err.status = res.status;
    throw err;
  }

  return data;
}

export const api = {
  getServices: () => request('GET', '/services'),
  getSpecialists: () => request('GET', '/services/specialists'),
  getAvailability: (date) => request('GET', `/availability?date=${date}`),
  createAppointment: (body) => request('POST', '/appointments', body),
  getAppointment: (code) => request('GET', `/appointments/${code}`),
  rescheduleAppointment: (code, body) => request('PUT', `/appointments/${code}`, body),
  cancelAppointment: (code) => request('DELETE', `/appointments/${code}`),
};
