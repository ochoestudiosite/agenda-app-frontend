export default function LandingContact({ businessName, socials = {} }) {
  const brandTitle = socials.brand_title || businessName || 'Cita24';
  const copyrightText = socials.copyright_text || '';

  return (
    <div className="pb-8 border-t border-edge/40 bg-card/40">

      <div className="section-container">
        {/* Bottom bar */}
        <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-[12px] font-medium text-ink-3">
            {copyrightText || `© ${new Date().getFullYear()} ${brandTitle}. Todos los derechos reservados.`}
          </p>
          <div className="flex items-center gap-5">
            <a href="#" className="text-[12px] font-medium text-ink-3 hover:text-ink transition-colors">
              Privacidad
            </a>

            <a href="#" className="text-[12px] font-medium text-ink-3 hover:text-ink transition-colors">
              Términos
            </a>

            <a
              href="https://cita24.com"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Desarrollado con Cita24"
              className="sm:inline-flex items-center gap-2 opacity-40 hover:opacity-70 transition-opacity duration-200 group"
            >
              <span className="text-[10px] font-medium text-ink-3 tracking-wide">Impulsado por</span>
              <span className="max-sm:ml-1 text-[12px] font-black tracking-tight leading-none text-ink-3 group-hover:text-ink transition-colors">
                Cita<span className="text-gold">24</span>
              </span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
