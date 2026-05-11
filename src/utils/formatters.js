export function formatDate(dateStr) {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('es-MX', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export function formatTime(timeStr, fmt = '12h') {
  if (!timeStr) return '';
  const [h, m] = timeStr.split(':').map(Number);
  if (fmt === '24h') return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  return new Date(2000, 0, 1, h, m).toLocaleTimeString('es-MX', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

export function formatPrice(price) {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    minimumFractionDigits: 0,
  }).format(price);
}

export function capitalize(str) {
  return str ? str.charAt(0).toUpperCase() + str.slice(1) : '';
}

// Unicode-safe title case: "pedro lopéZ" → "Pedro Lopéz"
export function toTitleCase(str) {
  if (!str) return str ?? '';
  return str.trim().toLowerCase().split(/\s+/).map(
    w => w ? w[0].toUpperCase() + w.slice(1) : w
  ).join(' ');
}

// Parse "HH:MM" or integer hour to minutes-from-midnight
function toMins(t) {
  if (typeof t === 'number') return t * 60;
  const [h, m = 0] = String(t).split(':').map(Number);
  return h * 60 + (m || 0);
}

function minToStr(m) {
  return `${Math.floor(m / 60)}:${String(m % 60).padStart(2, '0')}`;
}

// Generate time slots between openTime and closeTime.
// openTime / closeTime: "HH:MM" string OR integer hour (backward-compat).
// intervalMins: slot interval (default 30) — used as step when bufferMins = 0.
// serviceDuration: service length in minutes.
// bufferMins: rest/cleaning time after each appointment.
//   When > 0: step = serviceDuration + bufferMins. Buffer-zone markers are
//   interleaved into the returned array so the UI can show them as disabled.
//   Markers are always at slot_start + serviceDuration.
export function generateSlots(openTime, closeTime, serviceDuration = 30, intervalMins = 30, bufferMins = 0) {
  const start = toMins(openTime);
  const end   = toMins(closeTime);
  const slots = [];
  if (bufferMins > 0) {
    const step = serviceDuration + bufferMins;
    for (let m = start; m + serviceDuration <= end; m += step) {
      slots.push(minToStr(m));
      const bm = m + serviceDuration;
      if (bm < end) slots.push(minToStr(bm)); // buffer-zone marker
    }
  } else {
    for (let m = start; m < end; m += intervalMins) {
      slots.push(minToStr(m));
    }
  }
  return slots;
}

// Returns a Set of slot strings that are buffer-zone markers (always disabled).
// Matches the markers interleaved by generateSlots when bufferMins > 0.
export function getBufferMarkers(openTime, closeTime, serviceDuration, bufferMins) {
  if (!bufferMins) return new Set();
  const start = toMins(openTime);
  const end   = toMins(closeTime);
  const step  = serviceDuration + bufferMins;
  const markers = new Set();
  for (let m = start; m + serviceDuration <= end; m += step) {
    const bm = m + serviceDuration;
    if (bm < end) markers.add(minToStr(bm));
  }
  return markers;
}

// Group slots into morning / afternoon / evening
export function groupSlots(slots) {
  return {
    morning: slots.filter(s => parseInt(s) < 12),
    afternoon: slots.filter(s => parseInt(s) >= 12 && parseInt(s) < 17),
    evening: slots.filter(s => parseInt(s) >= 17),
  };
}
