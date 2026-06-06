import { Send, Instagram, Facebook, MessageSquare, Linkedin, ArrowUpRight } from 'lucide-react';

function TikTokIcon({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.11V9a6.33 6.33 0 00-.79-.05A6.34 6.34 0 003.15 15.3a6.34 6.34 0 0010.86 4.44c1.61-1.61 1.61-3.62 1.61-4.44V9.62A8.2 8.2 0 0019.59 11V7.5a4.83 4.83 0 010-.81z" />
    </svg>
  );
}

function YoutubeIcon({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M23.5 6.19a3.02 3.02 0 00-2.12-2.14C19.54 3.5 12 3.5 12 3.5s-7.54 0-9.38.55A3.02 3.02 0 00.5 6.19C0 8.04 0 12 0 12s0 3.96.5 5.81a3.02 3.02 0 002.12 2.14C4.46 20.5 12 20.5 12 20.5s7.54 0 9.38-.55a3.02 3.02 0 002.12-2.14C24 15.96 24 12 24 12s0-3.96-.5-5.81zM9.75 15.02V8.98L15.5 12l-5.75 3.02z" />
    </svg>
  );
}

const SOCIAL_CONFIG = [
  { key: 'instagram', label: 'Instagram', Icon: Instagram, urlFn: v => `https://instagram.com/${v}` },
  { key: 'facebook', label: 'Facebook', Icon: Facebook, urlFn: v => `https://facebook.com/${v}` },
  { key: 'whatsapp', label: 'WhatsApp', Icon: MessageSquare, urlFn: v => `https://wa.me/${v}` },
  { key: 'tiktok', label: 'TikTok', Icon: TikTokIcon, urlFn: v => `https://tiktok.com/@${v}` },
  { key: 'youtube', label: 'YouTube', Icon: YoutubeIcon, urlFn: v => `https://youtube.com/@${v}` },
  { key: 'linkedin', label: 'LinkedIn', Icon: Linkedin, urlFn: v => `https://linkedin.com/in/${v}` },
];

export default function LandingContact({ businessName, socials = {}, config = {} }) {
  const brandTitle = socials.brand_title || businessName || 'Cita24';
  const tagline = socials.tagline || 'Elevamos el estándar de la industria. Una experiencia diseñada para quienes valoran su tiempo y buscan sólo lo mejor.';
  const newsletterText = socials.newsletter_text || 'Recibe novedades y promociones exclusivas, sin spam.';
  const copyrightText = socials.copyright_text || '';

  const socialLinks = SOCIAL_CONFIG
    .filter(s => socials[s.key])
    .map(s => ({ ...s, url: s.urlFn(socials[s.key]) }));

  const footerLinks = [
    { name: 'Servicios', href: '#servicios', key: 'services_section' },
    { name: 'Equipo', href: '#equipo', key: 'staff_section' },
    { name: 'Testimoniales', href: '#testimoniales', key: 'testimonials_section' },
    { name: 'Ubicación', href: '#ubicacion', key: 'location_section' },
  ].filter(l => config[l.key]?.visible !== false);

  return (
    <div className="relative pt-20 lg:pt-28 pb-20 bg-card/40 border-t border-edge/40 overflow-hidden">
      {/* Subtle accent ribbon */}
      <div aria-hidden className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-px bg-gradient-to-r from-transparent via-gold/50 to-transparent" />

      <div className="section-container">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-10 lg:gap-12">
          {/* Brand column */}
          <div className="md:col-span-5 lg:col-span-6">
            <a
              href="/"
              onClick={e => { e.preventDefault(); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
              className="inline-block hover:opacity-75 transition-opacity"
            >
              <h3 className="font-display text-3xl sm:text-4xl lg:text-5xl font-semibold text-ink tracking-[-0.025em] leading-tight">
                {brandTitle}
              </h3>
            </a>
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
                className="absolute right-1.5 top-1.5 w-9 h-9 rounded-full bg-gold text-on-gold hover:opacity-90 active:scale-[0.97] flex items-center justify-center transition-all"
              >
                <Send size={13} strokeWidth={2.2} />
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
