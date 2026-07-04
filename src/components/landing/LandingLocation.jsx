import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, Phone, Clock, Mail, Navigation } from 'lucide-react';
import { nowPartsInTz } from '../../utils/businessTime';

const DAY_NAMES = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

// Normalize config into a flat array of location objects (1 per branch).
// Strategy: landing_config.location_section.locations[] stores ONLY landing-specific
// overrides (map_embed_url, directions_url, hours text). All catalogue fields
// (name, address, phone, email, image_url) are ALWAYS taken from the live
// config.branches[] so that admin changes are reflected immediately without
// requiring a re-publish of the landing.
function resolveLocations(config, locationConfig) {
  const liveBranches = config?.branches || [];
  const branchMap    = new Map(liveBranches.map(b => [b.id, b]));

  if (Array.isArray(locationConfig?.locations) && locationConfig.locations.length > 0) {
    // Keep only locations whose branch still exists (inactive/deleted branches
    // are absent from config.branches[], so we drop them automatically).
    const merged = locationConfig.locations
      .filter(loc => !loc.branch_id || branchMap.has(loc.branch_id))
      .map(loc => {
        if (!loc.branch_id) return loc;
        const branch = branchMap.get(loc.branch_id);
        // Catalogue fields always win so admin edits are live instantly.
        // Landing-specific fields (map_embed_url, directions_url) are preserved.
        return {
          ...loc,
          // ?? instead of || so that the admin explicitly clearing a field
          // (DB returns "") is honoured — || would treat "" as falsy and
          // fall back to the stale JSONB value, keeping the old text visible.
          name:      branch.name      ?? loc.name      ?? '',
          address:   branch.address   ?? loc.address   ?? '',
          phone:     branch.phone     ?? loc.phone     ?? '',
          email:     branch.email     ?? loc.email     ?? '',
          image_url: branch.image_url ?? loc.image_url ?? null,
        };
      });

    // Auto-include branches added after the last landing publish so the admin
    // doesn't need to re-publish just to make a new location appear.
    const configuredIds = new Set(
      locationConfig.locations.map(l => l.branch_id).filter(Boolean)
    );
    const newBranches = liveBranches
      .filter(b => !configuredIds.has(b.id))
      .map(b => ({
        branch_id:      b.id,
        name:           b.name      || '',
        address:        b.address   || '',
        phone:          b.phone     || '',
        email:          b.email     || '',
        image_url:      b.image_url || null,
        map_embed_url:  '',
        directions_url: '',
      }));

    // Re-sort to match the live catalogue order (backend returns branches
    // ordered by sort_order, id) so admin reordering is reflected immediately
    // without requiring a re-publish. New branches land in their correct
    // position instead of always being appended at the end.
    const branchOrder = new Map(liveBranches.map((b, i) => [b.id, i]));
    const all = [...merged, ...newBranches].sort((a, b) => {
      const ai = a.branch_id != null ? (branchOrder.get(a.branch_id) ?? Infinity) : Infinity;
      const bi = b.branch_id != null ? (branchOrder.get(b.branch_id) ?? Infinity) : Infinity;
      return ai - bi;
    });
    if (all.length) return all;
    // Fall through if all branches were deleted
  }

  // No custom config (or all branches deleted) — use live catalogue directly.
  if (liveBranches.length > 0) {
    return liveBranches.map(b => ({
      branch_id:      b.id,
      name:           b.name      || '',
      address:        b.address   || '',
      phone:          b.phone     || '',
      email:          b.email     || '',
      image_url:      b.image_url || null,
      map_embed_url:  '',
      directions_url: '',
    }));
  }

  return [];
}

// Solo permite URLs absolutas http(s) para el enlace de "cómo llegar", que es
// configurable por el admin en landing_config. Bloquea URIs javascript:/data:/
// vbscript: que React renderiza tal cual dentro de href → XSS almacenado en la
// página pública del tenant. El mapa auto-generado (Google Maps) ya es https fijo.
function safeHttpUrl(url) {
  if (typeof url !== 'string') return '';
  const trimmed = url.trim();
  return /^https?:\/\//i.test(trimmed) ? trimmed : '';
}

function getBranchHours(config, branchId) {
  const raw = config.hours || {};
  if (branchId != null && raw[String(branchId)]) return raw[String(branchId)];
  if (Array.isArray(raw)) return raw;
  return Object.values(raw)[0] || [];
}

function buildHoursDisplay(hours, hoursTextOverride) {
  if (hoursTextOverride) return { display: hoursTextOverride, closedDays: [] };
  if (!hours || !hours.length) return { display: '', closedDays: [] };

  const open   = hours.filter(h => h.is_open);
  // Sort closed days Mon-first so "Cerrado: X, Y" lists in Mon-Sun order
  const closed = [...hours.filter(h => !h.is_open)]
    .sort((a, b) => ((a.day_of_week + 6) % 7) - ((b.day_of_week + 6) % 7))
    .map(h => DAY_NAMES[h.day_of_week]);
  if (!open.length) return { display: '', closedDays: closed };

  // Sort Mon-first: map 0=Sun→6, 1=Mon→0 … 6=Sat→5
  const sorted = [...open].sort((a, b) => ((a.day_of_week + 6) % 7) - ((b.day_of_week + 6) % 7));

  // Group consecutive days that share identical open/close times.
  // Use (lastDow + 1) % 7 so Sáb(6)→Dom(0) is treated as consecutive.
  const groups = [];
  for (const day of sorted) {
    const prev      = groups[groups.length - 1];
    const adjacent  = prev && (prev.lastDow + 1) % 7 === day.day_of_week;
    const sameTimes = prev
      && prev.openTime  === (day.open_time?.slice(0, 5)  ?? '')
      && prev.closeTime === (day.close_time?.slice(0, 5) ?? '');

    if (adjacent && sameTimes) {
      prev.lastDow = day.day_of_week;
    } else {
      groups.push({
        firstDow:  day.day_of_week,
        lastDow:   day.day_of_week,
        openTime:  day.open_time?.slice(0, 5)  ?? '',
        closeTime: day.close_time?.slice(0, 5) ?? '',
      });
    }
  }

  const lines = groups.map(g => {
    const dayPart = g.firstDow === g.lastDow
      ? DAY_NAMES[g.firstDow]
      : `${DAY_NAMES[g.firstDow]} – ${DAY_NAMES[g.lastDow]}`;
    return `${dayPart} · ${g.openTime} – ${g.closeTime}`;
  });

  return { display: lines.join('\n'), closedDays: closed };
}

// Returns true when the current time in the business's own timezone falls
// within the branch's hours for today — un cliente visitando desde otra zona
// horaria debe ver "Abierto ahora" segun la hora del negocio, no la suya.
function isOpenNow(hours, tz) {
  if (!hours || !hours.length) return false;
  const { hour, minute, weekday } = nowPartsInTz(tz);
  const today = hours.find(h => h.day_of_week === weekday);
  if (!today?.is_open) return false;
  const [oh, om] = (today.open_time  || '').split(':').map(Number);
  const [ch, cm] = (today.close_time || '').split(':').map(Number);
  if (isNaN(oh) || isNaN(ch)) return false;
  const cur = hour * 60 + minute;
  return cur >= oh * 60 + om && cur < ch * 60 + cm;
}

export default function LandingLocation({ config = {}, locationConfig = {}, title, subtitle, subtitleAccent }) {
  const locations = resolveLocations(config, locationConfig);
  const [activeIdx, setActiveIdx] = useState(0);

  if (!locations.length) return null;

  const isMulti = locations.length > 1;
  const loc     = locations[Math.min(activeIdx, locations.length - 1)];
  const hours   = getBranchHours(config, loc.branch_id);
  const { display: hoursDisplay, closedDays } = buildHoursDisplay(hours, '');
  const openNow = isOpenNow(hours, config?.business_timezone ?? null);

  const infoRows = [
    loc.address && { icon: MapPin, label: 'Dirección', value: loc.address },
    loc.phone   && { icon: Phone,  label: 'Teléfono',  value: loc.phone },
    loc.email   && { icon: Mail,   label: 'Email',     value: loc.email, small: true },
    hoursDisplay ? {
      icon: Clock, label: 'Horarios',
      value: hoursDisplay,
      extra: closedDays.length ? `Cerrado: ${closedDays.join(', ')}` : null,
    } : null,
  ].filter(Boolean);

  // Auto-generate a Google Maps search URL when the branch has an address but no
  // explicit directions_url (e.g. auto-populated from catalogue without Landing Editor config).
  const effectiveDirectionsUrl = safeHttpUrl(loc.directions_url)
    || (loc.address ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(loc.address)}` : '');

  return (
    <section id="ubicacion" className="relative py-24 lg:py-32 overflow-hidden bg-card">
      <div className="section-container">

        {/* ── Section header + branch tabs ── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.22em] text-gold">
            <span className="w-6 h-px bg-gold" />
            {title || 'Encuéntranos'}
          </div>

          <div className="mt-3 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-5">
            <h2 className="font-display text-3xl sm:text-4xl lg:text-[44px] font-semibold text-ink tracking-[-0.025em] leading-[1.04] text-balance">
              {(subtitle || subtitleAccent) ? (
                <>
                  {subtitle}
                  {subtitleAccent && <><br /><span className="text-ink-3">{subtitleAccent}</span></>}
                </>
              ) : (
                <>Estamos donde <span className="text-ink-3">tú estás.</span></>
              )}
            </h2>

            {isMulti && (
              <div className="flex items-center gap-2 flex-wrap shrink-0">
                {locations.map((l, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setActiveIdx(i)}
                    className={[
                      'px-4 h-9 rounded-full text-[12px] font-semibold transition-all duration-200',
                      activeIdx === i
                        ? 'bg-gold text-on-gold shadow-sm'
                        : 'bg-raised text-ink-2 border border-edge/40 hover:bg-card hover:border-gold/30',
                    ].join(' ')}
                  >
                    {l.name || `Sucursal ${i + 1}`}
                  </button>
                ))}
              </div>
            )}
          </div>
        </motion.div>

        {/* ── Animated content per active branch ── */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeIdx}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
            className="mt-10 lg:mt-12 grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12"
          >
            {/* ── Info column ── */}
            <div className="lg:col-span-5 flex flex-col">
              {/* Branch image (from catalogue) or name pill (multi-branch) */}
              <div className="mb-6 relative aspect-[16/7] w-full rounded-[24px] landing-card-shape overflow-hidden bg-raised">
                {/* Placeholder — siempre visible mientras carga o si no hay imagen */}
                <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-raised via-card to-raised">
                  <span className="font-display text-6xl font-bold text-gold/20 select-none tracking-tight">
                    {loc.name ? loc.name.split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase() : '?'}
                  </span>
                </div>

                {/* Imagen encima — fade-in al cargar */}
                {loc.image_url && (
                  <img
                    src={loc.image_url}
                    alt={loc.name || 'Sucursal'}
                    loading="lazy"
                    className="absolute inset-0 w-full h-full object-cover"
                    style={{ opacity: 0, transition: 'opacity 200ms ease' }}
                    onLoad={e  => { e.currentTarget.style.opacity = '1'; }}
                    onError={e => { e.currentTarget.style.display = 'none'; }}
                  />
                )}
                {loc.name && (
                  <div className="absolute inset-x-0 bottom-0 px-5 py-4 bg-gradient-to-t from-black/60 to-transparent">
                    <p className="text-white text-[16px] font-semibold leading-tight drop-shadow-md">{loc.name}</p>
                  </div>
                )}
              </div>
              <div className="flex flex-col">
                {infoRows.map((row, i) => (
                  <InfoRow key={row.label} {...row} isLast={i === infoRows.length - 1} />
                ))}
              </div>
            </div>

            {/* ── Map column ── */}
            <div className="lg:col-span-7">
              <div className="relative aspect-[16/9] sm:aspect-[4/3] rounded-[36px] landing-card-shape overflow-hidden bg-raised border border-edge/40 shadow-[0_24px_60px_rgba(0,0,0,0.10)]">
                {loc.map_embed_url ? (
                  <a
                    href={effectiveDirectionsUrl || '#ubicacion'}
                    target={effectiveDirectionsUrl ? '_blank' : undefined}
                    rel={effectiveDirectionsUrl ? 'noopener noreferrer' : undefined}
                    className="absolute inset-0 block"
                    title="Ver en Google Maps"
                  >
                    <img
                      src={loc.map_embed_url}
                      alt={`Mapa${loc.name ? ` de ${loc.name}` : ''}`}
                      className="absolute inset-0 w-full h-full object-cover"
                      style={{ opacity: 0, transition: 'opacity 300ms ease' }}
                      onLoad={e  => { e.currentTarget.style.opacity = '1'; }}
                      onError={e => { e.currentTarget.style.display = 'none'; }}
                      loading="lazy"
                    />
                  </a>
                ) : (
                  <MapPlaceholder />
                )}

                {/* Floating directions card */}
                <div className="absolute inset-x-5 bottom-5 sm:inset-x-6 sm:bottom-6">
                  <div className="rounded-2xl bg-card/85 backdrop-blur-xl border border-edge/40 px-5 py-4 flex items-center justify-between gap-4 shadow-[0_12px_40px_rgba(0,0,0,0.18)]">
                    <div className="min-w-0">
                      {openNow ? (
                        <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-emerald-600 dark:text-emerald-400">
                          <span className="relative flex w-1.5 h-1.5">
                            <span className="absolute inset-0 rounded-full bg-emerald-500 animate-ping opacity-60" />
                            <span className="relative w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          </span>
                          Abierto ahora
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-gold/80">
                          <span className="w-1.5 h-1.5 rounded-full bg-gold/60 shrink-0" />
                          Agenda en línea
                        </div>
                      )}
                      <p className="mt-1 text-sm font-semibold text-ink truncate">
                        {openNow
                          ? (locationConfig?.open_now_text || 'Estamos listos para recibirte')
                          : 'Reserva tu cita cuando quieras'
                        }
                      </p>
                    </div>
                    <a
                      href={effectiveDirectionsUrl || '#ubicacion'}
                      target={effectiveDirectionsUrl ? '_blank' : undefined}
                      rel={effectiveDirectionsUrl ? 'noopener noreferrer' : undefined}
                      className="inline-flex items-center gap-1.5 bg-gold text-on-gold px-3.5 h-10 rounded-full text-[12px] font-semibold hover:opacity-90 active:scale-[0.97] transition-all shrink-0"
                    >
                      <Navigation size={12} strokeWidth={2.4} />
                      {locationConfig?.directions_text || 'Cómo llegar'}
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>

      </div>
    </section>
  );
}

function InfoRow({ icon: Icon, label, value, extra, small, isLast }) {
  return (
    <div className={`flex items-start gap-5 py-5 ${isLast ? '' : 'border-b border-edge/40'}`}>
      <div className="w-10 h-10 rounded-2xl border border-edge bg-card flex items-center justify-center text-ink shrink-0">
        <Icon size={16} strokeWidth={2} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-ink-3">{label}</p>
        <p className={`mt-1 font-medium text-ink leading-snug whitespace-pre-line ${small ? 'text-sm break-all' : 'text-base'}`}>
          {value}
        </p>
        {extra && <p className="text-xs text-ink-3 mt-1">{extra}</p>}
      </div>
    </div>
  );
}

function MapPlaceholder() {
  return (
    <div className="absolute inset-0">
      <div className="absolute inset-0 bg-gradient-to-br from-raised via-card to-raised" />
      <div className="absolute inset-0 opacity-[0.06]"
           style={{ backgroundImage: 'radial-gradient(rgb(var(--ink)) 1px, transparent 1px)', backgroundSize: '22px 22px' }} />
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="w-14 h-14 rounded-full bg-gold text-on-gold flex items-center justify-center shadow-[0_12px_30px_rgba(0,0,0,0.18)]">
          <MapPin size={22} strokeWidth={2.4} />
        </div>
      </div>
    </div>
  );
}
