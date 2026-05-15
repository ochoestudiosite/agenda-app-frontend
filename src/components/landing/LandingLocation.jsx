import { motion } from 'framer-motion';
import { MapPin, Phone, Clock, Mail, ArrowUpRight, Navigation } from 'lucide-react';

const DAY_NAMES = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

export default function LandingLocation({ config = {}, locationConfig = {}, title, subtitle, subtitleAccent }) {
  const address       = locationConfig.address       || config.business_address || '';
  const phone         = locationConfig.phone         || config.business_phone   || '';
  const email         = locationConfig.email         || config.business_email   || '';
  const mapEmbed      = locationConfig.map_embed_url || '';
  const hoursText     = locationConfig.hours_text    || '';
  const openNowText   = locationConfig.open_now_text   || 'Estamos listos para recibirte';
  const directionsTxt = locationConfig.directions_text || 'Cómo llegar';
  const directionsUrl = locationConfig.directions_url  || '';

  const hours = config.hours || [];
  let hoursDisplay = hoursText;
  if (!hoursDisplay && hours.length > 0) {
    const openDays = hours.filter(h => h.is_open);
    if (openDays.length > 0) {
      const first = openDays[0];
      const last  = openDays[openDays.length - 1];
      hoursDisplay = `${DAY_NAMES[first.day_of_week]} – ${DAY_NAMES[last.day_of_week]} · ${first.open_time?.slice(0, 5)} – ${last.close_time?.slice(0, 5)}`;
    }
  }
  const closedDays = hours.filter(h => !h.is_open).map(h => DAY_NAMES[h.day_of_week]);

  const infoRows = [
    address && { icon: MapPin, label: 'Dirección', value: address },
    phone   && { icon: Phone,  label: 'Teléfono',  value: phone },
    email   && { icon: Mail,   label: 'Email',     value: email,  small: true },
    { icon: Clock, label: 'Horarios', value: hoursDisplay || 'Lun – Sáb · 9:00 – 20:00', extra: closedDays.length ? `${closedDays.join(', ')} cerrado` : null },
  ].filter(Boolean);

  return (
    <section id="ubicacion" className="relative py-24 lg:py-32 overflow-hidden">
      <div className="section-container">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12">
          {/* Info column */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="lg:col-span-5 flex flex-col"
          >
            <div className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.22em] text-gold">
              <span className="w-6 h-px bg-gold" />
              {title || 'Encuéntranos'}
            </div>
            <h2 className="mt-3 font-display text-3xl sm:text-4xl lg:text-[44px] font-semibold text-ink tracking-[-0.025em] leading-[1.04] text-balance">
              {(subtitle || subtitleAccent) ? (
                <>
                  {subtitle}
                  {subtitleAccent && <><br /><span className="text-ink-3">{subtitleAccent}</span></>}
                </>
              ) : (
                <>Estamos donde <span className="text-ink-3">tú estás.</span></>
              )}
            </h2>

            <div className="mt-10 lg:mt-12 flex flex-col">
              {infoRows.map((row, i) => (
                <InfoRow key={row.label} {...row} isLast={i === infoRows.length - 1} />
              ))}
            </div>
          </motion.div>

          {/* Map column */}
          <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.7, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
            className="lg:col-span-7"
          >
            <div className="relative aspect-[5/6] sm:aspect-[4/3] lg:aspect-[5/6] rounded-[36px] overflow-hidden bg-raised border border-edge/40 shadow-[0_24px_60px_rgba(0,0,0,0.10)]">
              {mapEmbed ? (
                <iframe
                  src={mapEmbed}
                  className="absolute inset-0 w-full h-full border-none pointer-events-none select-none"
                  allowFullScreen
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  title="Ubicación del negocio"
                  tabIndex={-1}
                />
              ) : (
                <MapPlaceholder />
              )}

              {/* Floating status / directions card */}
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
                    <p className="mt-1 text-sm font-semibold text-ink truncate">{openNowText}</p>
                  </div>
                  {(directionsUrl || true) && (
                    <a
                      href={directionsUrl || '#ubicacion'}
                      target={directionsUrl ? '_blank' : undefined}
                      rel={directionsUrl ? 'noopener noreferrer' : undefined}
                      className="inline-flex items-center gap-1.5 bg-ink text-card px-3.5 h-10 rounded-full text-[12px] font-semibold hover:bg-gold hover:text-on-gold transition-colors shrink-0"
                    >
                      <Navigation size={12} strokeWidth={2.4} />
                      {directionsTxt}
                    </a>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        </div>
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
