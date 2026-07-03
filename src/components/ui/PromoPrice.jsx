import { formatPrice } from '../../utils/formatters';

// ── Componentes compartidos de precio promocional ─────────────────────────────
// Usados en booking (ClientForm, confirmación) y en gestión de citas
// (AppointmentCard, GroupAppointmentCard) para mostrar el descuento de forma
// consistente: lista tachada + precio final + línea de ahorro con la promo.

// Concepto registrado en el módulo de Promociones: "−20%" (porcentaje) ·
// "−$100" (monto fijo). Cae al monto descontado real para citas históricas
// sin el snapshot de tipo/valor.
export function promoConceptLabel({ promotionType, promotionValue, discountType, discountValue, discountAmount } = {}) {
  const type = promotionType ?? discountType;
  const val  = promotionValue ?? discountValue;
  if (type === 'percent' && val != null) return `−${Number(val).toLocaleString('es-MX', { maximumFractionDigits: 2 })}%`;
  // Monto fijo: el descuento REAL (puede topar con el precio) antes que el valor registrado.
  if (Number(discountAmount) > 0) return `−${formatPrice(Number(discountAmount))}`;
  if (type === 'fixed_amount' && val != null) return `−${formatPrice(Number(val))}`;
  return null;
}

// Chip dorado de promoción: "−20%" (porcentaje) o "−$100" (monto fijo).
export function PromoBadge({ discountType, discountValue, className = '' }) {
  const label = promoConceptLabel({ discountType, discountValue }) || 'PROMO';
  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wide bg-gold text-on-gold shrink-0 ${className}`}>
      {label}
    </span>
  );
}

// Estrella ✦ del pill de promoción.
function PromoStar({ className = 'w-2.5 h-2.5' }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path d="M12 2l2.09 6.26L20 10l-5.91 1.74L12 18l-2.09-6.26L4 10l5.91-1.74L12 2z" />
    </svg>
  );
}

// Pill completo de promoción: nombre + concepto (−20% / −$100) + código.
// Snapshot de la cita: promotionName, promotionType, promotionValue,
// promotionCode, discountAmount.
export function PromoTag({ promotionName, promotionType, promotionValue, promotionCode, discountAmount, className = '' }) {
  const concept = promoConceptLabel({ promotionType, promotionValue, discountAmount });
  if (!concept && !(Number(discountAmount) > 0)) return null;
  const name  = promotionName || 'Promoción';
  const title = [name, concept, promotionCode ? `código ${promotionCode}` : null].filter(Boolean).join(' · ');
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gold/12 text-gold border border-gold/25 text-[11px] font-semibold shrink-0 max-w-full ${className}`}
      title={title}
    >
      <PromoStar className="w-2.5 h-2.5 shrink-0" />
      <span className="truncate max-w-[130px]">{name}</span>
      {concept && <span className="tabular-nums font-bold shrink-0">· {concept}</span>}
      {promotionCode && <span className="font-mono tracking-wide text-gold/85 bg-gold/10 rounded px-1 shrink-0">#{promotionCode}</span>}
    </span>
  );
}

const SIZES = {
  sm: { struck: 'text-[11px]', final: 'text-[13px]' },
  md: { struck: 'text-[12px]',   final: 'text-[14px]' },
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
    <p className={`flex items-center justify-end gap-1 text-[12px] font-semibold text-gold tabular-nums ${className}`}>
      <svg className="w-3 h-3 shrink-0" fill="currentColor" viewBox="0 0 24 24" aria-hidden>
        <path d="M12 2l2.09 6.26L20 10l-5.91 1.74L12 18l-2.09-6.26L4 10l5.91-1.74L12 2z" />
      </svg>
      <span className="truncate">
        {verb} {formatPrice(amount)}{promoName ? ` · ${promoName}` : ''}
      </span>
    </p>
  );
}
