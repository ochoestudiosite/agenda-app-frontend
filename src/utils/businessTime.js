// "Ahora"/"hoy" anclados a la zona horaria del negocio (business_timezone),
// no a la del navegador del cliente. Usado por DateTimePicker, AppointmentCard
// y GroupAppointmentCard para que el auto-avance de fechas y los cutoffs de
// lead-time coincidan con lo que el backend valida en dateUtils.js.
// Si `tz` es falsy, todas las funciones caen a hora local del navegador
// (comportamiento previo, usado solo como fallback mientras carga el config).

const WEEKDAY_INDEX = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

export function nowPartsInTz(tz) {
  const now = new Date();
  if (!tz) {
    return {
      year: now.getFullYear(), month: now.getMonth() + 1, day: now.getDate(),
      hour: now.getHours(), minute: now.getMinutes(), weekday: now.getDay(),
    };
  }
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: false, weekday: 'short',
  }).formatToParts(now);
  const get = type => parts.find(p => p.type === type)?.value;
  const hour24 = get('hour');
  return {
    year: Number(get('year')),
    month: Number(get('month')),
    day: Number(get('day')),
    hour: hour24 === '24' ? 0 : Number(hour24),
    minute: Number(get('minute')),
    weekday: WEEKDAY_INDEX[get('weekday')],
  };
}

// Date a medianoche local que representa el día calendario de "hoy" en `tz`.
// Seguro para recorrer con setDate()/setMonth(): solo year/month/day importan
// para day-of-week y formato YYYY-MM-DD, y esos ya están resueltos en `tz`.
export function todayDateInTz(tz) {
  const { year, month, day } = nowPartsInTz(tz);
  return new Date(year, month - 1, day);
}

export function nowMinutesInTz(tz) {
  const { hour, minute } = nowPartsInTz(tz);
  return hour * 60 + minute;
}

function toDateStr(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// true si dateStr ("YYYY-MM-DD") + timeStr ("H:MM"/"HH:MM") ya pasó, comparado
// contra "ahora" en `tz`.
export function isPastDateTime(dateStr, timeStr, tz) {
  const apptStr = `${dateStr} ${(timeStr ?? '00:00').padStart(5, '0')}`;
  if (tz) {
    const nowStr = new Date().toLocaleString('sv', { timeZone: tz }).slice(0, 16);
    return apptStr < nowStr;
  }
  return new Date(`${dateStr}T${(timeStr ?? '00:00').padStart(5, '0')}:00`) < new Date();
}

// Próxima fecha con disponibilidad potencial.
// Salta: días pasados, días cerrados del negocio, fechas bloqueadas.
// "Potencialmente disponible" = no estructuralmente bloqueado.
// La verificación de slots ocupados ocurre al seleccionar la fecha.
export function findNextAvailableDate({ tz, bizHours = [], blockedDates = [], leadMins = 60, maxAdvanceDays = 30 }) {
  const { hour, minute, weekday } = nowPartsInTz(tz);
  const nowMins = hour * 60 + minute;
  const closedDays = new Set(bizHours.filter(h => !h.is_open).map(h => h.day_of_week));

  const todayEntry = bizHours.find(h => h.day_of_week === weekday);
  const closeMins = todayEntry ? (() => {
    const [ch, cm] = (todayEntry.close_time || '19:00').split(':').map(Number);
    return ch * 60 + cm;
  })() : 19 * 60;

  const tooLate = !todayEntry || !todayEntry.is_open || (nowMins + leadMins + 30 >= closeMins);

  const candidate = todayDateInTz(tz);
  if (tooLate) candidate.setDate(candidate.getDate() + 1);

  for (let i = 0; i <= maxAdvanceDays + 7; i++) {
    const ds = toDateStr(candidate);
    const dow = candidate.getDay();
    if (!closedDays.has(dow) && !blockedDates.includes(ds) && !blockedDates.includes(`recurring:${dow}`)) {
      return new Date(candidate);
    }
    candidate.setDate(candidate.getDate() + 1);
  }
  return null;
}
