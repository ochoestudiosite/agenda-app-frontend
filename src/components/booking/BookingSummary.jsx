import { useBooking, isGroupMode } from '../../context/BookingContext';
import { useConfig } from '../../hooks/useConfig';
import { toTitleCase, formatTime, formatCombinedPrice, formatPrice, promoSavings } from '../../utils/formatters';
import SummaryStrip from '../ui/SummaryStrip';

function shortDate(dateStr) {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('es-MX', {
    weekday: 'short', day: 'numeric', month: 'short',
  });
}

function nameInitials(name) {
  return (name || '').trim().split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase() || '?';
}

export default function BookingSummary() {
  const { state }        = useBooking();
  const { data: config } = useConfig();
  const timeFmt          = config?.time_format ?? '12h';

  const items = [];

  if (state.branch) {
    items.push({
      id:       'branch',
      category: 'sucursal',
      avatars:  [{ src: state.branch.image_url || null, initials: nameInitials(state.branch.name) }],
      label:    toTitleCase(state.branch.name),
      sub:      null,
    });
  }

  const selectedServices = state.services ?? [];
  if (selectedServices.length > 0) {
    const totalDuration = selectedServices.reduce((sum, s) => sum + (s.duration || 0), 0);
    const savings = promoSavings(selectedServices);
    const first = toTitleCase(selectedServices[0].name);
    items.push({
      id:       'service',
      category: selectedServices.length > 1 ? 'servicios' : 'servicio',
      avatars:  selectedServices.map(s => ({ src: s.imageUrl || null, initials: nameInitials(s.name) })),
      label:    selectedServices.length === 1
        ? first
        : `${first} +${selectedServices.length - 1} más`,
      sub:      `${totalDuration} min · ${formatCombinedPrice(selectedServices)}${savings > 0 ? ` · Ahorras ${formatPrice(savings)}` : ''}`,
    });
  }

  const groupMode = isGroupMode(state);
  if (groupMode) {
    const assignments = state.serviceAssignments ?? [];
    if (assignments.length > 0) {
      const first = toTitleCase(assignments[0].specialist.name);
      items.push({
        id:       'specialists',
        category: 'especialistas',
        avatars:  assignments.map(a => ({
          src:      a.specialist.avatarUrl || null,
          initials: a.specialist.initials || nameInitials(a.specialist.name),
        })),
        label:    assignments.length === 1
          ? first
          : `${first} y ${assignments.length - 1} más`,
        sub:      `${assignments.length} de ${state.services.length}`,
      });
    }
  } else if (state.specialist) {
    items.push({
      id:       'specialist',
      category: 'especialista',
      avatars:  [{
        src:      state.specialist.avatarUrl || null,
        initials: state.specialist.initials || nameInitials(state.specialist.name),
      }],
      label:    toTitleCase(state.specialist.name),
      sub:      state.specialist.specialty || null,
    });
  }

  if (state.date && state.time) {
    items.push({
      id:       'datetime',
      category: 'horario',
      label:    shortDate(state.date),
      sub:      formatTime(state.time, timeFmt),
    });
  }

  return <SummaryStrip items={items} ariaLabel="Resumen de tu selección" />;
}
