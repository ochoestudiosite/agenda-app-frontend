import { MapPin, Phone, Clock, Mail } from 'lucide-react';

export default function LandingLocation({ config = {}, title, subtitle }) {
  const address = config.business_address || 'Av. Insurgentes Sur 1234, Ciudad de México';
  const phone = config.business_phone || '+52 55 1234 5678';
  const email = config.business_email || 'hola@cita24.com';

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
              <div className="flex items-start gap-4 p-6 rounded-2xl bg-card border border-edge hover:border-gold/30 transition-all group">
                <div className="w-10 h-10 rounded-xl bg-ink/5 flex items-center justify-center text-ink group-hover:bg-ink group-hover:text-surface transition-all">
                  <MapPin size={20} />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-ink-3 uppercase tracking-widest mb-1">Dirección</h4>
                  <p className="text-ink font-medium leading-relaxed">{address}</p>
                </div>
              </div>

              <div className="flex items-start gap-4 p-6 rounded-2xl bg-card border border-edge hover:border-gold/30 transition-all group">
                <div className="w-10 h-10 rounded-xl bg-ink/5 flex items-center justify-center text-ink group-hover:bg-ink group-hover:text-surface transition-all">
                  <Phone size={20} />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-ink-3 uppercase tracking-widest mb-1">Contacto</h4>
                  <p className="text-ink font-medium leading-relaxed">{phone}</p>
                  <p className="text-ink-3 text-sm">{email}</p>
                </div>
              </div>

              <div className="flex items-start gap-4 p-6 rounded-2xl bg-card border border-edge hover:border-gold/30 transition-all group">
                <div className="w-10 h-10 rounded-xl bg-ink/5 flex items-center justify-center text-ink group-hover:bg-ink group-hover:text-surface transition-all">
                  <Clock size={20} />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-ink-3 uppercase tracking-widest mb-1">Horarios</h4>
                  <p className="text-ink font-medium leading-relaxed">Lun – Sáb: 9am – 8pm</p>
                  <p className="text-ink-3 text-sm">Domingo: Cerrado</p>
                </div>
              </div>
            </div>
          </div>

          {/* Map Side */}
          <div className="relative aspect-square lg:aspect-auto lg:h-[600px] rounded-[3rem] overflow-hidden border border-edge bg-raised shadow-2xl">
            {/* Placeholder for map / interactive element */}
            <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1526778548025-fa2f459cd5c1?auto=format&fit=crop&q=80&w=1000')] bg-cover bg-center grayscale opacity-60" />
            <div className="absolute inset-0 bg-gradient-to-t from-surface via-transparent to-transparent opacity-40" />
            
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-16 h-16 rounded-full bg-ink flex items-center justify-center text-surface shadow-2xl animate-bounce">
                <MapPin size={32} strokeWidth={2.5} />
              </div>
            </div>

            {/* Float glass card */}
            <div className="absolute bottom-8 left-8 right-8 glass p-6 rounded-2xl flex items-center justify-between shadow-2xl">
              <div>
                <p className="text-xs font-bold text-ink-3 uppercase tracking-wider mb-1">Abierto ahora</p>
                <p className="text-sm font-bold text-ink">Estamos listos para recibirte</p>
              </div>
              <button className="bg-ink text-surface px-4 py-2 rounded-xl text-xs font-bold hover:scale-105 active:scale-95 transition-all">
                Cómo llegar
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
