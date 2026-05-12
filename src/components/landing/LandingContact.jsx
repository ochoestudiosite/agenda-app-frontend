import { Send, Instagram, Facebook, MessageSquare, Youtube, Linkedin, ArrowUpRight } from 'lucide-react';

function TikTokIcon({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.11V9a6.33 6.33 0 00-.79-.05A6.34 6.34 0 003.15 15.3a6.34 6.34 0 0010.86 4.44c1.61-1.61 1.61-3.62 1.61-4.44V9.62A8.2 8.2 0 0019.59 11V7.5a4.83 4.83 0 010-.81z" />
    </svg>
  );
}

const SOCIAL_CONFIG = [
  { key: 'instagram', label: 'Instagram', Icon: Instagram,      urlFn: v => `https://instagram.com/${v}` },
  { key: 'facebook',  label: 'Facebook',  Icon: Facebook,       urlFn: v => `https://facebook.com/${v}` },
  { key: 'whatsapp',  label: 'WhatsApp',  Icon: MessageSquare,  urlFn: v => `https://wa.me/${v}` },
  { key: 'tiktok',    label: 'TikTok',    Icon: TikTokIcon,     urlFn: v => `https://tiktok.com/@${v}` },
  { key: 'youtube',   label: 'YouTube',   Icon: Youtube,        urlFn: v => `https://youtube.com/@${v}` },
  { key: 'linkedin',  label: 'LinkedIn',  Icon: Linkedin,       urlFn: v => `https://linkedin.com/in/${v}` },
];

// linkBase: prefix for section anchor links.
//   ''  — same-page hash (landing page, smooth scroll works)
//   '/' — navigates to home then scrolls (sub-pages like /agendar, /gestionar)
export default function LandingContact({ businessName, socials = {}, config = {}, linkBase = '' }) {
  const brandTitle     = socials.brand_title     || businessName || 'Cita24';
  const tagline        = socials.tagline         || 'Elevamos el estándar de la industria. Una experiencia diseñada para quienes valoran su tiempo y buscan sólo lo mejor.';
  const newsletterText = socials.newsletter_text || 'Recibe novedades y promociones exclusivas, sin spam.';
  const copyrightText  = socials.copyright_text  || '';

  const socialLinks = SOCIAL_CONFIG
    .filter(s => socials[s.key])
    .map(s => ({ ...s, url: s.urlFn(socials[s.key]) }));

  const footerLinks = [
    { name: 'Servicios',     href: `${linkBase}#servicios`,     key: 'services_section' },
    { name: 'Equipo',        href: `${linkBase}#equipo`,        key: 'staff_section' },
    { name: 'Testimoniales', href: `${linkBase}#testimoniales`, key: 'testimonials_section' },
    { name: 'Ubicación',     href: `${linkBase}#ubicacion`,     key: 'location_section' },
  ].filter(l => config[l.key]?.visible !== false);

  return (
    <footer className="relative pt-20 lg:pt-28 pb-8 bg-card/40 border-t border-edge/40 overflow-hidden">
      {/* Subtle accent ribbon */}
      <div aria-hidden className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-px bg-gradient-to-r from-transparent via-gold/50 to-transparent" />

      <div className="section-container">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-10 lg:gap-12">
          {/* Brand column */}
          <div className="md:col-span-5 lg:col-span-6">
            <h3 className="font-display text-3xl sm:text-4xl lg:text-5xl font-semibold text-ink tracking-[-0.025em] leading-tight">
              {brandTitle}
            </h3>
            <p className="mt-5 text-ink-2 text-[15px] leading-relaxed max-w-md">
              {tagline}
            </p>

            {socialLinks.length > 0 && (
              <div className="mt-7 flex flex-wrap gap-2">
                {socialLinks.map(({ key, label, Icon, url }) => (
                  <a
                    key={key}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={label}
                    className="w-10 h-10 rounded-full border border-edge bg-card text-ink-2 hover:bg-ink hover:text-card hover:border-ink flex items-center justify-center transition-colors"
                  >
                    <Icon size={15} />
                  </a>
                ))}
              </div>
            )}
          </div>

          {/* Links column */}
          {footerLinks.length > 0 && (
            <div className="md:col-span-3 lg:col-span-2">
              <h4 className="text-[10px] font-bold text-ink uppercase tracking-[0.22em] mb-5">Explorar</h4>
              <ul className="space-y-3.5">
                {footerLinks.map(l => (
                  <li key={l.name}>
                    <a
                      href={l.href}
                      className="inline-flex items-center gap-1.5 text-[14px] font-medium text-ink-2 hover:text-ink transition-colors group"
                    >
                      {l.name}
                      <ArrowUpRight size={13} strokeWidth={2.2} className="text-ink-3 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Newsletter column */}
          <div className="md:col-span-4 lg:col-span-4">
            <h4 className="text-[10px] font-bold text-ink uppercase tracking-[0.22em] mb-5">Novedades</h4>
            <p className="text-[13px] text-ink-2 leading-relaxed mb-4">{newsletterText}</p>
            <form
              onSubmit={(e) => e.preventDefault()}
              className="relative flex items-center"
            >
              <input
                type="email"
                placeholder="tu@email.com"
                required
                className="w-full h-12 bg-card border border-edge rounded-full pl-5 pr-14 text-[14px] font-medium text-ink placeholder:text-ink-3 focus:outline-none focus:border-gold/60 focus:ring-2 focus:ring-gold/15 transition-all"
              />
              <button
                type="submit"
                aria-label="Suscribirme"
                className="absolute right-1.5 top-1.5 w-9 h-9 rounded-full bg-ink text-card hover:bg-gold hover:text-on-gold flex items-center justify-center transition-colors"
              >
                <Send size={13} strokeWidth={2.2} />
              </button>
            </form>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-16 lg:mt-20 pt-6 border-t border-edge/40 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-[11px] font-medium text-ink-3">
            {copyrightText || `© ${new Date().getFullYear()} ${brandTitle}. Todos los derechos reservados.`}
          </p>
          <div className="flex items-center gap-5">
            <a href="#" className="text-[11px] font-medium text-ink-3 hover:text-ink transition-colors">Privacidad</a>
            <a href="#" className="text-[11px] font-medium text-ink-3 hover:text-ink transition-colors">Términos</a>
            <a
              href="https://cita24.com"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Desarrollado con Cita24"
              className="hidden sm:inline-flex items-center gap-2 opacity-40 hover:opacity-70 transition-opacity duration-200 group"
            >
              <span className="text-[9.5px] font-medium text-ink-3 tracking-wide">Impulsado por</span>
              <span className="text-[11.5px] font-black tracking-tight leading-none text-ink-3 group-hover:text-ink transition-colors">
                Cita<span className="text-gold">24</span>
              </span>
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
