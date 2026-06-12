import { formatPrice } from '../../utils/formatters';

// ── Componentes compartidos de precio promocional ─────────────────────────────
// Usados en booking (ClientForm, confirmación) y en gestión de citas
// (AppointmentCard, GroupAppointmentCard) para mostrar el descuento de forma
// consistente: lista tachada + precio final + línea de ahorro con la promo.

// Chip dorado de promoción: "−20%" para porcentaje, "PROMO" para monto fijo.
export function PromoBadge({ discountType, discountValue, className = '' }) {
  const label = discountType === 'percent' ? `−${Number(discountValue)}%` : 'PROMO';
  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[0.625rem] font-bold uppercase tracking-wide bg-gold text-on-gold shrink-0 ${className}`}>
      {label}
    </span>
  );
}

const SIZES = {
  sm: { struck: 'text-[10.5px]', final: 'text-[13px]' },
  md: { struck: 'text-[11px]',   final: 'text-[14px]' },
  lg: { struck: 'text-xs',       final: 'text-[17px]' },
  xl: { struck: 'text-xs',       final: 'text-[18px]' },
};

// Precio con promo en dos líneas: lista tachada (muted) sobre el final (gold).
// `original` y `final` llegan ya formateados (respetan "Desde $X" / "$X+").
export function StruckPrice({ original, final: finalStr, size = 'md', className = '' }) {
  const s = SIZES[size] ?? SIZES.md;
  return (
    <div className={`flex flex-col items-end leading-tight shrink-0 ${className}`}>
      <span className={`${s.struck} text-ink-3 line-through tabular-nums`}>{original}</span>
      <span className={`${s.final} font-bold text-gold tabular-nums`}>{finalStr}</span>
    </div>
  );
}

// Línea de ahorro para filas de total: "✦ Ahorras $70 · Promo de verano".
export function SavingsNote({ amount, promoName = null, verb = 'Ahorras', className = '' }) {
  if (!(Number(amount) > 0)) return null;
  return (
    <p className={`flex items-center justify-end gap-1 text-[11px] font-semibold text-gold tabular-nums ${className}`}>
      <svg className="w-3 h-3 shrink-0" fill="currentColor" viewBox="0 0 24 24" aria-hidden>
        <path d="M12 2l2.09 6.26L20 10l-5.91 1.74L12 18l-2.09-6.26L4 10l5.91-1.74L12 2z" />
      </svg>
      <span className="truncate">
        {verb} {formatPrice(amount)}{promoName ? ` · ${promoName}` : ''}
      </span>
    </p>
  );
}
