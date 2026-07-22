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

// Stripe amounts travel as integer cents (payment.amount_cents). Distinct from
// formatPrice (pesos, 0 decimals) because a deposit split can land on cents
// (e.g. 30% of $280.00 = $84.00, but other combos won't round to whole pesos).
export function formatPriceFromCents(cents) {
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format((Number(cents) || 0) / 100);
}

export function formatServicePrice(service) {
  switch (service.priceType) {
    case 'starting_from': return `Desde ${formatPrice(service.price)}`;
    case 'range':         return service.priceMax != null
                            ? `${formatPrice(service.price)} – ${formatPrice(service.priceMax)}`
                            : `${formatPrice(service.price)}+`;
    case 'ask':           return 'Consultar';
    default:              return formatPrice(service.price);
  }
}

// Precio efectivo de un servicio: el promocional cuando hay promo vigente
// (calculada server-side y adjunta por GET /services), el de lista si no.
export function effectiveServicePrice(service) {
  return service?.promo?.finalPrice ?? service?.price ?? 0;
}

// Ahorro total por promociones en una selección de servicios.
export function promoSavings(services) {
  if (!services?.length) return 0;
  return services.reduce((sum, s) => sum + (s.promo?.discountAmount || 0), 0);
}

// Etiqueta corta de vigencia de una promo: "hasta el 19 jun" (null sin fecha de fin).
// `tz`: IANA timezone del negocio (config.business_timezone). La expiración real
// se valida server-side contra TIMESTAMPTZ/NOW(); esto solo evita que la etiqueta
// muestre un día distinto al que realmente aplica cerca de la medianoche del negocio.
export function promoEndsLabel(endsAt, tz) {
  if (!endsAt) return null;
  const d = new Date(endsAt);
  if (isNaN(d)) return null;
  return `hasta el ${d.toLocaleDateString('es-MX', { day: 'numeric', month: 'short', timeZone: tz || undefined })}`;
}

// Combined price display for a list of selected services.
// Handles all 4 priceTypes and multi-service combos correctly.
// Usa el precio promocional cuando el servicio tiene promo vigente.
export function formatCombinedPrice(services) {
  if (!services || services.length === 0) return '';
  const hasAsk          = services.some(s => s.priceType === 'ask');
  const hasRange        = services.some(s => s.priceType === 'range');
  const hasStartingFrom = services.some(s => s.priceType === 'starting_from');
  const knownMin        = services.reduce((sum, s) => sum + (s.priceType === 'ask' ? 0 : effectiveServicePrice(s)), 0);
  if (hasAsk) {
    return knownMin > 0 ? `${formatPrice(knownMin)}+` : 'Precio a consultar';
  }
  if (hasRange) {
    if (services.length === 1 && services[0].priceMax != null) {
      return `${formatPrice(services[0].price)} – ${formatPrice(services[0].priceMax)}`;
    }
    return `${formatPrice(knownMin)}+`;
  }
  if (hasStartingFrom) {
    return `Desde ${formatPrice(knownMin)}`;
  }
  return formatPrice(knownMin);
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

// Generate time slots between openTime and closeTime.
// openTime / closeTime: "HH:MM" string OR integer hour (backward-compat).
// intervalMins: slot interval — controls how often slots appear.
// serviceDuration: service length in minutes (used only by callers for overlap checks).
// bufferMins: rest/cleaning time added to the slot step.
//   step = intervalMins + bufferMins, so slots are spaced to account for the buffer.
//   e.g. interval=30, buffer=10 → step=40 → slots at 9:00, 9:40, 10:20, 11:00…
export function generateSlots(openTime, closeTime, _serviceDuration = 30, intervalMins = 30, bufferMins = 0) {
  const start = toMins(openTime);
  const end   = toMins(closeTime);
  const step  = intervalMins + bufferMins;
  const slots = [];
  for (let m = start; m < end; m += step) {
    slots.push(`${Math.floor(m / 60)}:${String(m % 60).padStart(2, '0')}`);
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
