import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, Phone, Clock, Mail, Navigation } from 'lucide-react';

const DAY_NAMES = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

// Normalize config into a flat array of location objects (1 per branch).
// Priority:
//  1. locationConfig.locations[] — Landing Editor customization (highest)
//  2. config.branches[]          — catalogue data from admin (auto, like Services/Staff)
//  3. Legacy flat fields          — business_settings address/phone/email fallback
function resolveLocations(config, locationConfig) {
  // 1. Landing Editor has explicit location config → use it as-is
  if (Array.isArray(locationConfig?.locations) && locationConfig.locations.length > 0) {
    return locationConfig.locations;
  }

  // 2. Auto-populate from catalogue branches (same pattern as LandingServices/LandingStaff).
  // Only include branches that have at least one displayable field — otherwise fall through
  // to the legacy path so a freshly-created business with no location data hides the section.
  if (Array.isArray(config?.branches) && config.branches.length > 0) {
    const withData = config.branches.filter(b => b.address || b.phone || b.email || b.image_url);
    if (withData.length > 0) {
      return withData.map(b => ({
        branch_id:     b.id,
        name:          b.name      || '',
        address:       b.address   || '',
        phone:         b.phone     || '',
        email:         b.email     || '',
        image_url:     b.image_url || null,
        map_embed_url: '',
        directions_url: '',
      }));
    }
  }

  // Siempre hay al menos 1 sucursal (el backend lo garantiza).
  return [];
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

// Returns true when the current local time falls within the branch's hours for today.
// Uses browser local time as an approximation (business and client are typically co-located).
function isOpenNow(hours) {
  if (!hours || !hours.length) return false;
  const now   = new Date();
  const dow   = now.getDay();
  const today = hours.find(h => h.day_of_week === dow);
  if (!today?.is_open) return false;
  const [oh, om] = (today.open_time  || '').split(':').map(Number);
  const [ch, cm] = (today.close_time || '').split(':').map(Number);
  if (isNaN(oh) || isNaN(ch)) return false;
  const cur = now.getHours() * 60 + now.getMinutes();
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
  const openNow = isOpenNow(hours);

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
  const effectiveDirectionsUrl = loc.directions_url
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
          <div className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.22em] text-gold">
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
              <div className="mb-6 relative aspect-[16/7] w-full rounded-[24px] overflow-hidden bg-raised">
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
              <div className="relative aspect-[16/9] sm:aspect-[4/3] rounded-[36px] overflow-hidden bg-raised border border-edge/40 shadow-[0_24px_60px_rgba(0,0,0,0.10)]">
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
                        <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-600 dark:text-emerald-400">
                          <span className="relative flex w-1.5 h-1.5">
                            <span className="absolute inset-0 rounded-full bg-emerald-500 animate-ping opacity-60" />
                            <span className="relative w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          </span>
                          Abierto ahora
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.18em] text-gold/80">
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
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-ink-3">{label}</p>
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
