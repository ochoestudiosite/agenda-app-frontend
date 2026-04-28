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

export function formatTime(timeStr) {
  if (!timeStr) return '';
  const [h, m] = timeStr.split(':').map(Number);
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

// Generate all 30-min slots between start and end hour
export function generateSlots(startHour, endHour, serviceDuration = 30) {
  const slots = [];
  for (let h = startHour; h < endHour; h++) {
    for (const m of [0, 30]) {
      const totalEnd = h * 60 + m + serviceDuration;
      if (totalEnd <= endHour * 60) {
        slots.push(`${h}:${m === 0 ? '00' : m}`);
      }
    }
  }
  return slots;
}

// Group slots into morning / afternoon / evening
export function groupSlots(slots) {
  return {
    morning: slots.filter(s => parseInt(s) < 12),
    afternoon: slots.filter(s => parseInt(s) >= 12 && parseInt(s) < 17),
    evening: slots.filter(s => parseInt(s) >= 17),
  };
}
