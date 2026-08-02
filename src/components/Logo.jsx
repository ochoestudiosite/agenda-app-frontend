// Official Cita24 wordmark (calendar icon + "Cita24" lockup). Wide asset (~3.15:1) —
// not a square icon. This is Cita24's OWN brand mark — never use it to represent a
// tenant's business (tenants use their own logo_url / brand tokens, see
// BrandTokensApplier.jsx). Use `variant="white"` only when placed directly on a
// solid brand-green background; `variant="green"` (default) works on white, gray
// or dark neutral backgrounds.
export default function Logo({ variant = 'green', height = 28, className = '' }) {
  const src = variant === 'white' ? '/cita24-logo-white.png' : '/cita24-logo-green.png';
  return (
    <img
      src={src}
      alt="Cita24"
      height={height}
      style={{ height, width: 'auto', display: 'block' }}
      className={className}
    />
  );
}
