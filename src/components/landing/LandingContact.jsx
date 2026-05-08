import { Send, Instagram, Facebook, MessageSquare, Youtube, Linkedin } from 'lucide-react';

function TikTokIcon({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.11V9a6.33 6.33 0 00-.79-.05A6.34 6.34 0 003.15 15.3a6.34 6.34 0 0010.86 4.44c1.61-1.61 1.61-3.62 1.61-4.44V9.62A8.2 8.2 0 0019.59 11V7.5a4.83 4.83 0 010-.81z" />
    </svg>
  );
}

const SOCIAL_CONFIG = [
  { key: 'instagram', Icon: Instagram,      urlFn: v => `https://instagram.com/${v}` },
  { key: 'facebook',  Icon: Facebook,       urlFn: v => `https://facebook.com/${v}` },
  { key: 'whatsapp',  Icon: MessageSquare,  urlFn: v => `https://wa.me/${v}` },
  { key: 'tiktok',    Icon: TikTokIcon,     urlFn: v => `https://tiktok.com/@${v}` },
  { key: 'youtube',   Icon: Youtube,        urlFn: v => `https://youtube.com/@${v}` },
  { key: 'linkedin',  Icon: Linkedin,       urlFn: v => `https://linkedin.com/in/${v}` },
];

export default function LandingContact({ businessName, socials = {}, config = {} }) {
  const brandTitle     = socials.brand_title     || businessName || 'Cita24';
  const tagline        = socials.tagline         || 'Elevamos el estándar de la industria. Una experiencia diseñada para quienes valoran su tiempo y buscan solo lo mejor.';
  const newsletterText = socials.newsletter_text  || 'Recibe promociones y noticias exclusivas.';
  const copyrightText  = socials.copyright_text   || '';

  const socialLinks = SOCIAL_CONFIG
    .filter(s => socials[s.key])
    .map(s => ({ ...s, url: s.urlFn(socials[s.key]) }));

  // Dynamic footer links based on section visibility
  const footerLinks = [
    { name: 'Servicios',     href: '#servicios',     key: 'services_section' },
    { name: 'Equipo',        href: '#equipo',         key: 'staff_section' },
    { name: 'Testimoniales', href: '#testimoniales',  key: 'testimonials_section' },
    { name: 'Ubicación',     href: '#ubicacion',      key: 'location_section' },
  ].filter(l => config[l.key]?.visible !== false);

  return (
    <footer className="pt-20 pb-10 bg-surface border-t border-edge/50">
      <div className="section-container">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 lg:gap-16 mb-16">
          
          {/* Brand Col */}
          <div className="lg:col-span-2">
            <h3 className="font-display text-2xl font-bold text-ink mb-4">{brandTitle}</h3>
            <p className="text-ink-2 text-sm max-w-sm mb-6 leading-relaxed">{tagline}</p>
            {socialLinks.length > 0 && (
              <div className="flex gap-2.5 flex-wrap">
                {socialLinks.map(({ key, Icon, url }) => (
                  <a key={key} href={url} target="_blank" rel="noopener noreferrer"
                    className="w-9 h-9 rounded-xl bg-ink/5 flex items-center justify-center text-ink/60 hover:bg-gold hover:text-white transition-all">
                    <Icon size={16} />
                  </a>
                ))}
              </div>
            )}
          </div>

          {/* Links Col */}
          {footerLinks.length > 0 && (
            <div>
              <h4 className="text-[11px] font-bold text-ink uppercase tracking-widest mb-5">Explorar</h4>
              <ul className="space-y-3">
                {footerLinks.map(l => (
                  <li key={l.name}>
                    <a href={l.href} className="text-sm font-medium text-ink/50 hover:text-gold transition-colors">{l.name}</a>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Newsletter Col */}
          <div>
            <h4 className="text-[11px] font-bold text-ink uppercase tracking-widest mb-5">Novedades</h4>
            <p className="text-xs text-ink-3 mb-3">{newsletterText}</p>
            <div className="relative">
              <input 
                type="email" 
                placeholder="tu@email.com"
                className="w-full bg-raised/30 border border-edge/50 rounded-xl py-2.5 px-4 text-xs font-medium focus:outline-none focus:border-gold transition-all"
              />
              <button className="absolute right-1.5 top-1.5 w-7 h-7 rounded-lg bg-gold text-on-gold flex items-center justify-center hover:bg-gold-light transition-all">
                <Send size={12} />
              </button>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="pt-6 border-t border-edge/30 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-[11px] font-medium text-ink/30">
            {copyrightText || `© ${new Date().getFullYear()} ${brandTitle}. Todos los derechos reservados.`}
          </p>
          <div className="flex gap-6">
            <a href="#" className="text-[11px] font-medium text-ink/30 hover:text-ink transition-colors">Privacidad</a>
            <a href="#" className="text-[11px] font-medium text-ink/30 hover:text-ink transition-colors">Términos</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
