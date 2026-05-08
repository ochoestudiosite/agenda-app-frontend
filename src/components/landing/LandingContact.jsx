import { Send, Instagram, Facebook, MessageSquare } from 'lucide-react';

export default function LandingContact({ businessName, socials = {} }) {
  const instagram = socials.instagram ? `https://instagram.com/${socials.instagram}` : null;
  const facebook  = socials.facebook  ? `https://facebook.com/${socials.facebook}` : null;
  const whatsapp  = socials.whatsapp  ? `https://wa.me/${socials.whatsapp}` : null;
  return (
    <footer className="pt-24 pb-12 bg-surface border-t border-edge">
      <div className="section-container">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-20">
          
          {/* Brand Col */}
          <div className="lg:col-span-2">
            <h3 className="font-display text-3xl font-bold text-ink mb-6">
              {businessName || 'Cita24'}
            </h3>
            <p className="text-ink-2 max-w-sm mb-8 leading-relaxed">
              Elevamos el estándar de la industria. Una experiencia diseñada para quienes valoran su tiempo y buscan solo lo mejor.
            </p>
            <div className="flex gap-4">
              {instagram && (
                <a href={instagram} target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-xl bg-ink/5 flex items-center justify-center text-ink hover:bg-gold hover:text-white transition-all cursor-pointer">
                  <Instagram size={18} />
                </a>
              )}
              {facebook && (
                <a href={facebook} target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-xl bg-ink/5 flex items-center justify-center text-ink hover:bg-gold hover:text-white transition-all cursor-pointer">
                  <Facebook size={18} />
                </a>
              )}
              {whatsapp && (
                <a href={whatsapp} target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-xl bg-ink/5 flex items-center justify-center text-ink hover:bg-gold hover:text-white transition-all cursor-pointer">
                  <MessageSquare size={18} />
                </a>
              )}
            </div>
          </div>

          {/* Links Col */}
          <div>
            <h4 className="text-xs font-bold text-ink uppercase tracking-widest mb-6">Explorar</h4>
            <ul className="space-y-4">
              {['Servicios', 'Equipo', 'Testimoniales', 'Ubicación'].map(l => (
                <li key={l}>
                  <a href={`#${l.toLowerCase()}`} className="text-sm font-medium text-ink-2 hover:text-gold transition-colors">{l}</a>
                </li>
              ))}
            </ul>
          </div>

          {/* Newsletter Col */}
          <div>
            <h4 className="text-xs font-bold text-ink uppercase tracking-widest mb-6">Novedades</h4>
            <p className="text-xs text-ink-3 mb-4">Recibe promociones y noticias exclusivas.</p>
            <div className="relative">
              <input 
                type="email" 
                placeholder="tu@email.com"
                className="w-full bg-raised/30 border border-edge/50 rounded-xl py-3 px-4 text-xs font-medium focus:outline-none focus:border-gold transition-all"
              />
              <button className="absolute right-2 top-2 w-8 h-8 rounded-lg bg-ink text-surface flex items-center justify-center hover:bg-gold transition-all">
                <Send size={14} />
              </button>
            </div>
          </div>

        </div>

        {/* Bottom bar */}
        <div className="pt-8 border-t border-edge flex flex-col md:flex-row items-center justify-between gap-6">
          <p className="text-xs font-medium text-ink-3">
            © {new Date().getFullYear()} {businessName || 'Cita24'}. Todos los derechos reservados.
          </p>
          <div className="flex gap-8">
            <a href="#" className="text-xs font-medium text-ink-3 hover:text-ink transition-colors">Privacidad</a>
            <a href="#" className="text-xs font-medium text-ink-3 hover:text-ink transition-colors">Términos</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
