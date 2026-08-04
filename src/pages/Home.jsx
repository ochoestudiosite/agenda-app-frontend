import { useState, useEffect, useRef } from 'react';
import { Navigate } from 'react-router-dom';
import { Lock, AlertTriangle } from 'lucide-react';
import { useConfig } from '../hooks/useConfig';
import { useServices } from '../hooks/useServices';
import LandingNavbar from '../components/landing/LandingNavbar';
import LandingHero from '../components/landing/LandingHero';
import LandingServices from '../components/landing/LandingServices';
import LandingStaff from '../components/landing/LandingStaff';
import LandingTestimonials from '../components/landing/LandingTestimonials';
import LandingLocation from '../components/landing/LandingLocation';
import LandingFAQ from '../components/landing/LandingFAQ';
import LandingContact from '../components/landing/LandingContact';
import LandingSkeleton from '../components/landing/LandingSkeleton';
import LandingBottomBar from '../components/landing/LandingBottomBar';

import { isAllowedAdminOrigin } from '../utils/originUtils';

// Best-effort parent origin inference for the LANDING_READY signal.
// Falls back to '*' when document.referrer is unavailable (cross-origin block).
// og:image/twitter:image have no static placeholder in index.html (there is
// no universal default asset to show for a tenant without a hero photo or
// logo) — created on demand only when a real image URL is available, removed
// otherwise. NOTE: like the title/description tags updated alongside this,
// these only apply after client-side JS runs — crawlers that don't execute
// JS (WhatsApp's own link-unfurler notably doesn't) will not see them; a
// real fix requires server-side/edge prerendering for bot user-agents,
// which is a separate, larger piece of work.
function setSocialImage(url) {
  const upsert = (attrName, attrValue) => {
    let el = document.querySelector(`meta[${attrName}="${attrValue}"]`);
    if (!url) { el?.remove(); return; }
    if (!el) {
      el = document.createElement('meta');
      el.setAttribute(attrName, attrValue);
      document.head.appendChild(el);
    }
    el.setAttribute('content', url);
  };
  upsert('property', 'og:image');
  upsert('name', 'twitter:image');
  // summary_large_image only makes sense with an actual image.
  document.querySelector('meta[name="twitter:card"]')?.setAttribute('content', url ? 'summary_large_image' : 'summary');
}

function inferParentOrigin() {
  try {
    if (document.referrer) {
      const ref = new URL(document.referrer);
      const refOrigin = `${ref.protocol}//${ref.host}`;
      if (isAllowedAdminOrigin(refOrigin)) return refOrigin;
    }
  } catch { /* intentional */ }
  return '*';
}

export default function Home() {
  const { data: config, isLoading: loadingConfig, isError: configIsError, error: configError } = useConfig();
  // Landing page: mounts once per session, so it can afford a much shorter
  // freshness window than the booking wizard's default (60s) — admin edits
  // to services/staff should show up quickly. Matches useConfig()'s 10s.
  const { data: catalogData, isLoading: loadingCatalog } = useServices(undefined, { staleTime: 10_000 });

  const isLoading = loadingConfig || loadingCatalog;

  // Hash navigation on hard refresh: the browser tries to scroll to #section
  // before React has rendered the sections. Once loading completes and the DOM
  // is ready, we scroll to the target element exactly once.
  const hashHandled = useRef(false);
  useEffect(() => {
    if (isLoading || hashHandled.current) return;
    hashHandled.current = true;
    const hash = window.location.hash;
    if (!hash) return;
    const timer = setTimeout(() => {
      try {
        const el = document.querySelector(hash);
        // 'instant' evita que IntersectionObserver dispare whileInView en
        // secciones intermedias durante el scroll programático, lo que haría
        // que Framer Motion (once:true) las marque como vistas y no las
        // anime cuando el usuario llegue a ellas de forma orgánica.
        if (el) el.scrollIntoView({ behavior: 'instant' });
      } catch { /* scroll best-effort — ignorar si el nodo no existe */ }
    }, 150);
    return () => clearTimeout(timer);
  }, [isLoading]);

  const [previewConfig, setPreviewConfig] = useState(null);

  // SaaS Feature Flag: Verificar si el tenant tiene contratada la Landing Page
  // (Por defecto es true para retrocompatibilidad, solo se desactiva si es explícitamente false)
  const isLandingEnabled = config?.features?.landing_enabled !== false;

  // Listen for live preview updates from admin dashboard
  useEffect(() => {
    const handleMessage = (event) => {
      // SECURITY: only accept messages from trusted admin origins.
      // Dev: localhost (any port) — Prod: same registered public domain.
      if (!isAllowedAdminOrigin(event.origin)) return;

      if (event.data?.type === 'LANDING_PREVIEW') {
        setPreviewConfig(event.data.config);
      }
      // SET_THEME is handled by BrandTokensApplier (mounted for the whole
      // SPA lifetime), not here — Home unmounts on route change and would
      // stop reacting to the Studio Editor's Claro/Oscuro toggle otherwise.
    };
    window.addEventListener('message', handleMessage);

    // Notify parent that we are ready to receive preview data.
    // Carries no sensitive payload, but we still target the parent origin when known.
    if (window.parent !== window) {
      const targetOrigin = inferParentOrigin();
      window.parent.postMessage({ type: 'LANDING_READY' }, targetOrigin);
    }

    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const businessName = config?.business_name || 'Cita24';

  // Dynamic title + description: "Cita24 — [Business Name]" once config loads.
  // Resets to default on unmount so other routes aren't affected.
  useEffect(() => {
    if (!config?.business_name) return;
    const name = config.business_name;
    document.title = `${name} - Cita24.com`;
    const setMeta = (sel, val) => document.querySelector(sel)?.setAttribute('content', val);
    setMeta('meta[name="description"]', `Agenda tu cita en ${name}. Reservas online rápidas y fáciles.`);
    setMeta('meta[property="og:title"]', `${name} - Cita24.com`);
    setMeta('meta[property="og:description"]', `Agenda tu cita en ${name}. Reservas online rápidas y fáciles.`);
    setMeta('meta[name="twitter:title"]', `${name} - Cita24.com`);
    setMeta('meta[name="twitter:description"]', `Agenda tu cita en ${name}. Reservas online rápidas y fáciles.`);

    let rawLanding = config.landing || config.landing_config || {};
    if (typeof rawLanding === 'string') {
      try { rawLanding = JSON.parse(rawLanding); } catch { rawLanding = {}; }
    }
    setSocialImage(rawLanding?.hero?.background_image_url || config.logo_url || null);

    return () => {
      document.title = 'Agenda tu Cita - Cita24.com';
      setSocialImage(null);
    };
  }, [config?.business_name, config?.logo_url, config?.landing, config?.landing_config]);

  // Robust parsing of landing_config
  let savedConfig = config?.landing || config?.landing_config || {};
  if (typeof savedConfig === 'string') {
    try { savedConfig = JSON.parse(savedConfig); } catch { savedConfig = {}; }
  }

  const bc = previewConfig || savedConfig;
  const services = catalogData?.services || [];
  const staff    = catalogData?.specialists || [];

  // Note: brand token application (colour, surface, ink, fonts, radius, button
  // shape) lives in components/BrandTokensApplier.jsx and is mounted once at
  // the App level so /agendar and /gestionar inherit the same brand. This
  // page-level effect is only for ad-hoc preview overrides via postMessage —
  // see setPreviewConfig below.

  // Si ya tenemos la config y la landing está desactivada por el plan (SaaS tiering),
  // redirigimos inmediatamente de forma silenciosa y transparente a la vista de reservas.
  // Ignoramos esta regla si estamos dentro del iframe del Admin (previewConfig activo).
  if (config && !isLandingEnabled && !previewConfig) {
    return <Navigate to="/agendar" replace />;
  }

  if (isLoading && !previewConfig) {
    return <LandingSkeleton />;
  }

  // Tenant deleted or suspended — no point retrying.
  if (configIsError && !previewConfig && (configError?.status === 403 || configError?.status === 404)) {
    return (
      <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, padding: '2rem', textAlign: 'center', fontFamily: 'system-ui, sans-serif' }}>
        <div style={{ width: 48, height: 48, borderRadius: 12, background: '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6b7280' }}>
          <Lock size={24} />
        </div>
        <div>
          <p style={{ fontWeight: 700, fontSize: 16, color: '#111', margin: '0 0 4px' }}>Este negocio no está disponible</p>
          <p style={{ fontSize: 14, color: '#6b7280', margin: 0 }}>La página que buscas no existe o ya no está activa.</p>
        </div>
      </div>
    );
  }

  // If config failed to load (network error, server down) and we're not in
  // preview mode, show a minimal error state instead of the skeleton forever.
  if (configIsError && !previewConfig) {
    return (
      <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, padding: '2rem', textAlign: 'center', fontFamily: 'system-ui, sans-serif' }}>
        <div style={{ width: 48, height: 48, borderRadius: 12, background: '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#F59E0B' }}>
          <AlertTriangle size={24} />
        </div>
        <div>
          <p style={{ fontWeight: 700, fontSize: 16, color: '#111', margin: '0 0 4px' }}>No se pudo cargar la página</p>
          <p style={{ fontSize: 14, color: '#6b7280', margin: 0 }}>Verifica tu conexión e intenta de nuevo.</p>
        </div>
        <button
          onClick={() => window.location.reload()}
          style={{ padding: '10px 24px', borderRadius: 10, background: 'rgb(var(--gold))', color: 'rgb(var(--on-gold))', border: 'none', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}
        >
          Reintentar
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface selection:bg-gold/30 selection:text-ink">
      <LandingNavbar
        businessName={businessName}
        config={bc}
        overPhoto={Boolean(bc.hero?.background_image_url)}
      />

      <main>
        <LandingHero
          title={bc.hero?.title}
          titleAccent={bc.hero?.title_accent}
          subtitle={bc.hero?.subtitle}
          cta={bc.hero?.cta_text}
          secondaryCta={bc.hero?.secondary_cta_text}
          features={bc.hero?.features}
          showFeatures={bc.hero?.show_features}
          badge={bc.hero?.badge_text}
          showBadge={bc.hero?.show_badge}
          backgroundImage={bc.hero?.background_image_url}
          overlayOpacity={bc.hero?.overlay_opacity}
          overlayBrightness={bc.hero?.overlay_brightness}
          focalPoint={bc.hero?.focal_point}
        />

        {(bc.services_section?.visible !== false) && (
          <LandingServices
            services={services}
            title={bc.services_section?.title}
            subtitle={bc.services_section?.subtitle}
            subtitleAccent={bc.services_section?.subtitle_accent}
            buttonText={bc.services_section?.button_text}
            linkText={bc.services_section?.link_text}
          />
        )}

        {(bc.staff_section?.visible !== false) && (
          <LandingStaff
            staff={staff}
            services={services}
            title={bc.staff_section?.title}
            subtitle={bc.staff_section?.subtitle}
            subtitleAccent={bc.staff_section?.subtitle_accent}
          />
        )}

        {(bc.testimonials_section?.visible === true) && (
          <LandingTestimonials
            items={bc.testimonials}
            title={bc.testimonials_section?.title}
            subtitle={bc.testimonials_section?.subtitle}
            subtitleAccent={bc.testimonials_section?.subtitle_accent}
          />
        )}

        {(bc.location_section?.visible !== false) && (
          <LandingLocation
            config={config || {}}
            locationConfig={bc.location_section || {}}
            title={bc.location_section?.title}
            subtitle={bc.location_section?.subtitle}
            subtitleAccent={bc.location_section?.subtitle_accent}
          />
        )}

        {(bc.faq_section?.visible === true) && (
          <LandingFAQ
            items={bc.faq}
            title={bc.faq_section?.title}
            subtitle={bc.faq_section?.subtitle}
            subtitleAccent={bc.faq_section?.subtitle_accent}
          />
        )}
      </main>

      <footer className="relative bg-card/40 border-t border-edge/40 overflow-hidden">
        <LandingContact
          businessName={bc.navbar?.business_name || businessName}
          socials={bc.contact_section}
          config={bc}
        />

        <LandingBottomBar
          businessName={bc.navbar?.business_name || businessName}
          socials={bc.contact_section}
          config={bc}
        />
      </footer>
    </div>
  );
}
