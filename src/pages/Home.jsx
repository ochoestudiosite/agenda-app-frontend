import { useState, useEffect, useRef } from 'react';
import { Navigate } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { useConfig } from '../hooks/useConfig';
import { useServices } from '../hooks/useServices';
import LandingNavbar from '../components/landing/LandingNavbar';
import LandingHero from '../components/landing/LandingHero';
import LandingServices from '../components/landing/LandingServices';
import LandingStaff from '../components/landing/LandingStaff';
import LandingTestimonials from '../components/landing/LandingTestimonials';
import LandingLocation from '../components/landing/LandingLocation';
import LandingContact from '../components/landing/LandingContact';
import LandingSkeleton from '../components/landing/LandingSkeleton';
import LandingBottomBar from '../components/landing/LandingBottomBar';

import { isAllowedAdminOrigin } from '../utils/originUtils';

// Best-effort parent origin inference for the LANDING_READY signal.
// Falls back to '*' when document.referrer is unavailable (cross-origin block).
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
  const { data: catalogData, isLoading: loadingCatalog } = useServices();

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
  const { isDark, toggle } = useTheme();

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
      if (event.data?.type === 'SET_THEME') {
        const wantDark = event.data.theme === 'dark';
        // Only toggle if the current state doesn't match
        if (wantDark !== isDark) toggle();
      }
    };
    window.addEventListener('message', handleMessage);

    // Notify parent that we are ready to receive preview data.
    // Carries no sensitive payload, but we still target the parent origin when known.
    if (window.parent !== window) {
      const targetOrigin = inferParentOrigin();
      window.parent.postMessage({ type: 'LANDING_READY' }, targetOrigin);
    }

    return () => window.removeEventListener('message', handleMessage);
  }, [isDark, toggle]);

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
    return () => { document.title = 'Agenda tu Cita - Cita24.com'; };
  }, [config?.business_name]);

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
          <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 10.5V6.75a4.5 4.5 0 119 0v3.75M3.75 21.75h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H3.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"/>
          </svg>
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
          <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"/>
          </svg>
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

      <div className="fixed bottom-10 right-10 pointer-events-none opacity-20">
        <div className="w-px h-24 bg-gradient-to-b from-transparent via-gold to-transparent" />
      </div>
    </div>
  );
}
