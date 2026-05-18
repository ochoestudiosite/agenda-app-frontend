import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, Phone, Clock, Mail, Navigation } from 'lucide-react';

const DAY_NAMES = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

// Normalize config into a flat array of location objects (1 per branch).
// New format: locationConfig.locations[]
// Legacy format: flat address/phone/email/etc. on locationConfig
function resolveLocations(config, locationConfig) {
  if (Array.isArray(locationConfig?.locations) && locationConfig.locations.length > 0) {
    return locationConfig.locations;
  }
  const address        = locationConfig?.address        || config.business_address || '';
  const phone          = locationConfig?.phone          || config.business_phone   || '';
  const email          = locationConfig?.email          || config.business_email   || '';
  const map_embed_url  = locationConfig?.map_embed_url  || '';
  const directions_url = locationConfig?.directions_url || '';
  if (!address && !phone && !email && !map_embed_url) return [];
  return [{
    branch_id:      config.branches?.[0]?.id   ?? null,
    name:           config.branches?.[0]?.name ?? null,
    address, phone, email,
    hours_text:      locationConfig?.hours_text      || '',
    map_embed_url,
    directions_url,
    open_now_text:   locationConfig?.open_now_text   || 'Estamos listos para recibirte',
    directions_text: locationConfig?.directions_text || 'Cómo llegar',
  }];
}

function getBranchHours(config, branchId) {
  const raw = config.hours || {};
  if (branchId != null && raw[String(branchId)]) return raw[String(branchId)];
  if (Array.isArray(raw)) return raw;
  return Object.values(raw)[0] || [];
}

function buildHoursDisplay(hours, hoursTextOverride) {
  if (hoursTextOverride) return { display: hoursTextOverride, closedDays: [] };
  const open   = hours.filter(h => h.is_open);
  const closed = hours.filter(h => !h.is_open).map(h => DAY_NAMES[h.day_of_week]);
  if (!open.length) return { display: '', closedDays: closed };
  const first = open[0];
  const last  = open[open.length - 1];
  return {
    display: `${DAY_NAMES[first.day_of_week]} – ${DAY_NAMES[last.day_of_week]} · ${first.open_time?.slice(0, 5)} – ${last.close_time?.slice(0, 5)}`,
    closedDays: closed,
  };
}

export default function LandingLocation({ config = {}, locationConfig = {}, title, subtitle, subtitleAccent }) {
  const locations = resolveLocations(config, locationConfig);
  const [activeIdx, setActiveIdx] = useState(0);

  if (!locations.length) return null;

  const isMulti = locations.length > 1;
  const loc     = locations[Math.min(activeIdx, locations.length - 1)];
  const hours   = getBranchHours(config, loc.branch_id);
  const { display: hoursDisplay, closedDays } = buildHoursDisplay(hours, loc.hours_text);

  const infoRows = [
    loc.address && { icon: MapPin, label: 'Dirección', value: loc.address },
    loc.phone   && { icon: Phone,  label: 'Teléfono',  value: loc.phone },
    loc.email   && { icon: Mail,   label: 'Email',     value: loc.email, small: true },
    {
      icon: Clock, label: 'Horarios',
      value: hoursDisplay || 'Lun – Sáb · 9:00 – 20:00',
      extra: closedDays.length ? `${closedDays.join(', ')} cerrado` : null,
    },
  ].filter(Boolean);

  return (
    <section id="ubicacion" className="relative py-24 lg:py-32 overflow-hidden">
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
              {isMulti && loc.name && (
                <div className="mb-6 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-gold/10 flex items-center justify-center shrink-0">
                    <MapPin size={14} className="text-gold" />
                  </div>
                  <p className="text-[15px] font-semibold text-ink leading-tight">{loc.name}</p>
                </div>
              )}
              <div className="flex flex-col">
                {infoRows.map((row, i) => (
                  <InfoRow key={row.label} {...row} isLast={i === infoRows.length - 1} />
                ))}
              </div>
            </div>

            {/* ── Map column ── */}
            <div className="lg:col-span-7">
              <div className="relative aspect-[5/6] sm:aspect-[4/3] lg:aspect-[5/6] rounded-[36px] overflow-hidden bg-raised border border-edge/40 shadow-[0_24px_60px_rgba(0,0,0,0.10)]">
                {loc.map_embed_url ? (
                  <iframe
                    src={loc.map_embed_url}
                    className="absolute inset-0 w-full h-full border-none pointer-events-none select-none"
                    allowFullScreen
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                    title={`Ubicación${loc.name ? `: ${loc.name}` : ''}`}
                    tabIndex={-1}
                  />
                ) : (
                  <MapPlaceholder />
                )}

                {/* Floating directions card */}
                <div className="absolute inset-x-5 bottom-5 sm:inset-x-6 sm:bottom-6">
                  <div className="rounded-2xl bg-card/85 backdrop-blur-xl border border-edge/40 px-5 py-4 flex items-center justify-between gap-4 shadow-[0_12px_40px_rgba(0,0,0,0.18)]">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-600 dark:text-emerald-400">
                        <span className="relative flex w-1.5 h-1.5">
                          <span className="absolute inset-0 rounded-full bg-emerald-500 animate-ping opacity-60" />
                          <span className="relative w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        </span>
                        Abierto ahora
                      </div>
                      <p className="mt-1 text-sm font-semibold text-ink truncate">
                        {loc.open_now_text || 'Estamos listos para recibirte'}
                      </p>
                    </div>
                    <a
                      href={loc.directions_url || '#ubicacion'}
                      target={loc.directions_url ? '_blank' : undefined}
                      rel={loc.directions_url ? 'noopener noreferrer' : undefined}
                      className="inline-flex items-center gap-1.5 bg-ink text-card px-3.5 h-10 rounded-full text-[12px] font-semibold hover:bg-gold hover:text-on-gold transition-colors shrink-0"
                    >
                      <Navigation size={12} strokeWidth={2.4} />
                      {loc.directions_text || 'Cómo llegar'}
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
        <p className={`mt-1 font-medium text-ink leading-snug ${small ? 'text-sm break-all' : 'text-base'}`}>
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
