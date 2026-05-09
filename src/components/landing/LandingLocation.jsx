import { MapPin, Phone, Clock, Mail } from 'lucide-react';

const DAY_NAMES = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

export default function LandingLocation({ config = {}, locationConfig = {}, title, subtitle }) {
  const address = locationConfig.address || config.business_address || '';
  const phone   = locationConfig.phone   || config.business_phone   || '';
  const email   = locationConfig.email   || config.business_email   || '';
  const mapEmbed = locationConfig.map_embed_url || '';
  const hoursText = locationConfig.hours_text || '';
  const openNowText = locationConfig.open_now_text || 'Estamos listos para recibirte';
  const directionsText = locationConfig.directions_text || 'Cómo llegar';
  const directionsUrl = locationConfig.directions_url || '';

  // Build hours from business_hours if available and no custom text
  const hours = config.hours || [];
  let hoursDisplay = hoursText;
  if (!hoursDisplay && hours.length > 0) {
    const openDays = hours.filter(h => h.is_open);
    if (openDays.length > 0) {
      const firstOpen = openDays[0];
      const lastOpen = openDays[openDays.length - 1];
      hoursDisplay = `${DAY_NAMES[firstOpen.day_of_week]} – ${DAY_NAMES[lastOpen.day_of_week]}: ${firstOpen.open_time?.slice(0,5)} – ${lastOpen.close_time?.slice(0,5)}`;
    }
  }
  const closedDays = hours.filter(h => !h.is_open).map(h => DAY_NAMES[h.day_of_week]);

  return (
    <section id="ubicacion" className="py-24 bg-surface/20">
      <div className="section-container">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Info Side */}
          <div>
            <div className="flex items-center gap-2 text-gold font-bold text-xs uppercase tracking-widest mb-4">
              <MapPin size={14} />
              {title || 'Encuéntranos'}
            </div>
            <h2 className="text-4xl md:text-5xl font-bold text-ink tracking-tightest leading-tight mb-8 text-balance">
              {subtitle ? (
                subtitle
              ) : (
                <>Estamos donde <br /><span className="text-ink-3">tú estás.</span></>
              )}
            </h2>

            <div className="space-y-6">
              {address && (
                <div className="flex items-start gap-4 p-5 rounded-2xl bg-card hover:shadow-lg transition-all group"
                  style={{ boxShadow: '0 1px 3px rgb(0 0 0 / 0.04), 0 4px 20px rgb(0 0 0 / 0.03)' }}>
                  <div className="w-10 h-10 rounded-xl bg-gold/10 flex items-center justify-center text-gold group-hover:bg-gold group-hover:text-on-gold transition-all">
                    <MapPin size={20} />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-ink-3 uppercase tracking-widest mb-1">Dirección</h4>
                    <p className="text-ink font-medium leading-relaxed">{address}</p>
                  </div>
                </div>
              )}

              {(phone || email) && (
                <div className="flex items-start gap-4 p-5 rounded-2xl bg-card hover:shadow-lg transition-all group"
                  style={{ boxShadow: '0 1px 3px rgb(0 0 0 / 0.04), 0 4px 20px rgb(0 0 0 / 0.03)' }}>
                  <div className="w-10 h-10 rounded-xl bg-gold/10 flex items-center justify-center text-gold group-hover:bg-gold group-hover:text-on-gold transition-all">
                    <Phone size={20} />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-ink-3 uppercase tracking-widest mb-1">Contacto</h4>
                    {phone && <p className="text-ink font-medium leading-relaxed">{phone}</p>}
                    {email && <p className="text-ink-3 text-sm">{email}</p>}
                  </div>
                </div>
              )}

              <div className="flex items-start gap-4 p-5 rounded-2xl bg-card hover:shadow-lg transition-all group"
                style={{ boxShadow: '0 1px 3px rgb(0 0 0 / 0.04), 0 4px 20px rgb(0 0 0 / 0.03)' }}>
                <div className="w-10 h-10 rounded-xl bg-gold/10 flex items-center justify-center text-gold group-hover:bg-gold group-hover:text-on-gold transition-all">
                  <Clock size={20} />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-ink-3 uppercase tracking-widest mb-1">Horarios</h4>
                  <p className="text-ink font-medium leading-relaxed">{hoursDisplay || 'Lun – Sáb: 9:00 – 20:00'}</p>
                  {closedDays.length > 0 && (
                    <p className="text-ink-3 text-sm">{closedDays.join(', ')}: Cerrado</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Map Side */}
          <div className="relative aspect-square lg:aspect-auto lg:h-[600px] rounded-[3rem] overflow-hidden border border-edge bg-raised shadow-2xl">
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
              <>
                <div className="absolute inset-0 bg-gradient-to-br from-raised to-edge/30" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-16 h-16 rounded-full bg-gold flex items-center justify-center text-on-gold shadow-2xl animate-bounce">
                    <MapPin size={32} strokeWidth={2.5} />
                  </div>
                </div>
              </>
            )}

            {/* Float glass card */}
            <div className="absolute bottom-8 left-8 right-8 glass p-6 rounded-2xl flex items-center justify-between shadow-2xl">
              <div>
                <p className="text-xs font-bold text-ink-3 uppercase tracking-wider mb-1">Abierto ahora</p>
                <p className="text-sm font-bold text-ink">{openNowText}</p>
              </div>
              {directionsUrl ? (
                <a href={directionsUrl} target="_blank" rel="noopener noreferrer"
                  className="bg-gold text-on-gold px-4 py-2 rounded-xl text-xs font-bold hover:scale-105 active:scale-95 transition-all">
                  {directionsText}
                </a>
              ) : (
                <button className="bg-gold text-on-gold px-4 py-2 rounded-xl text-xs font-bold hover:scale-105 active:scale-95 transition-all">
                  {directionsText}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
