import { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../services/api';
import { useTheme } from '../context/ThemeContext';
import LandingNavbar from '../components/landing/LandingNavbar';
import LandingHero from '../components/landing/LandingHero';
import LandingServices from '../components/landing/LandingServices';
import LandingStaff from '../components/landing/LandingStaff';
import LandingTestimonials from '../components/landing/LandingTestimonials';
import LandingLocation from '../components/landing/LandingLocation';
import LandingContact from '../components/landing/LandingContact';
import LandingSkeleton from '../components/landing/LandingSkeleton';
import LandingBottomBar from '../components/landing/LandingBottomBar';

// ── postMessage origin allowlist (mirrors backend CORS policy) ──────────────
// Allows: localhost in dev, exact PUBLIC_DOMAIN, any single-level subdomain.
function isAllowedAdminOrigin(origin) {
  if (!origin || typeof origin !== 'string') return false;
  if (origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:')) return true;

  const publicDomain = (import.meta.env.VITE_PUBLIC_DOMAIN || 'cita24.com').toLowerCase();
  try {
    const url = new URL(origin);
    if (url.protocol !== 'https:') return false;
    const host = url.hostname.toLowerCase();
    if (host === publicDomain) return true;
    if (!host.endsWith(`.${publicDomain}`)) return false;
    // Reject deep subdomains (sub.sub.cita24.com) to match backend CORS rules
    const sub = host.slice(0, -(publicDomain.length + 1));
    return sub.length > 0 && !sub.includes('.');
  } catch {
    return false;
  }
}

// Best-effort parent origin inference for the LANDING_READY signal.
// Falls back to '*' when document.referrer is unavailable (cross-origin block).
function inferParentOrigin() {
  try {
    if (document.referrer) {
      const ref = new URL(document.referrer);
      const refOrigin = `${ref.protocol}//${ref.host}`;
      if (isAllowedAdminOrigin(refOrigin)) return refOrigin;
    }
  } catch { }
  return '*';
}

export default function Home() {
  const { data: config, isLoading: loadingConfig, isError: configError } = useQuery({
    queryKey: ['config'],
    queryFn: api.getConfig,
    retry: 2,
  });

  const { data: servicesData, isLoading: loadingServices } = useQuery({
    queryKey: ['services'],
    queryFn: api.getServices,
    staleTime: 0,
    refetchOnMount: 'always',
    retry: 2,
  });

  const { data: staffData, isLoading: loadingStaff } = useQuery({
    queryKey: ['specialists'],
    queryFn: api.getSpecialists,
    retry: 2,
  });

  const isLoading = loadingConfig || loadingServices || loadingStaff;

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
    document.title = `Cita24 — ${name}`;
    const setMeta = (sel, val) => document.querySelector(sel)?.setAttribute('content', val);
    setMeta('meta[name="description"]', `Agenda tu cita en ${name}. Reservas online rápidas y fáciles.`);
    setMeta('meta[property="og:title"]', `Cita24 — ${name}`);
    setMeta('meta[property="og:description"]', `Agenda tu cita en ${name}. Reservas online rápidas y fáciles.`);
    setMeta('meta[name="twitter:title"]', `Cita24 — ${name}`);
    setMeta('meta[name="twitter:description"]', `Agenda tu cita en ${name}. Reservas online rápidas y fáciles.`);
    return () => { document.title = 'Cita24 — Agenda tu Cita'; };
  }, [config?.business_name]);

  // Robust parsing of landing_config
  let savedConfig = config?.landing || config?.landing_config || {};
  if (typeof savedConfig === 'string') {
    try { savedConfig = JSON.parse(savedConfig); } catch { savedConfig = {}; }
  }

  const bc = previewConfig || savedConfig;
  const services = servicesData?.services || servicesData?.data || [];
  const staff = staffData?.specialists || staffData?.data || [];

  // Note: brand token application (colour, surface, ink, fonts, radius, button
  // shape) lives in components/BrandTokensApplier.jsx and is mounted once at
  // the App level so /agendar and /gestionar inherit the same brand. This
  // page-level effect is only for ad-hoc preview overrides via postMessage —
  // see setPreviewConfig below.
  const design = bc.design || {};

  // Si ya tenemos la config y la landing está desactivada por el plan (SaaS tiering),
  // redirigimos inmediatamente de forma silenciosa y transparente a la vista de reservas.
  // Ignoramos esta regla si estamos dentro del iframe del Admin (previewConfig activo).
  if (config && !isLandingEnabled && !previewConfig) {
    return <Navigate to="/agendar" replace />;
  }

  if (isLoading && !previewConfig) {
    return <LandingSkeleton />;
  }

  // If config failed to load (network error, server down) and we're not in
  // preview mode, show a minimal error state instead of the skeleton forever.
  if (configError && !previewConfig) {
    return (
      <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, padding: '2rem', textAlign: 'center', fontFamily: 'system-ui, sans-serif' }}>
        <div style={{ width: 48, height: 48, borderRadius: 12, background: '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>⚠️</div>
        <div>
          <p style={{ fontWeight: 700, fontSize: 16, color: '#111', margin: '0 0 4px' }}>No se pudo cargar la página</p>
          <p style={{ fontSize: 14, color: '#6b7280', margin: 0 }}>Verifica tu conexión e intenta de nuevo.</p>
        </div>
        <button
          onClick={() => window.location.reload()}
          style={{ padding: '10px 24px', borderRadius: 10, background: '#00B87A', color: '#fff', border: 'none', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}
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
        />

        {(bc.services_section?.visible !== false) && (
          <LandingServices
            services={services}
            customServices={bc.services_section?.custom_items}
            useCustom={bc.services_section?.use_custom === true}
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
            customStaff={bc.staff_section?.custom_items}
            useCustom={bc.staff_section?.use_custom === true}
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
