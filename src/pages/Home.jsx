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
  } catch {}
  return '*';
}

export default function Home() {
  const { data: config, isLoading: loadingConfig } = useQuery({ 
    queryKey: ['config'], 
    queryFn: api.getConfig 
  });

  const { data: servicesData, isLoading: loadingServices } = useQuery({ 
    queryKey: ['services'], 
    queryFn: api.getServices 
  });

  const { data: staffData, isLoading: loadingStaff } = useQuery({ 
    queryKey: ['specialists'], 
    queryFn: api.getSpecialists 
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
  
  // Robust parsing of landing_config
  let savedConfig = config?.landing || config?.landing_config || {};
  if (typeof savedConfig === 'string') {
    try { savedConfig = JSON.parse(savedConfig); } catch { savedConfig = {}; }
  }

  const bc = previewConfig || savedConfig;
  const services = servicesData?.services || servicesData?.data || [];
  const staff = staffData?.specialists || staffData?.data || [];

  // ── Utility: hex → RGB triplet ──
  const hexToRgb = (hex) => {
    if (!hex || hex.length < 7) return null;
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `${r} ${g} ${b}`;
  };

  const lightenHex = (hex, amount = 30) => {
    if (!hex || hex.length < 7) return null;
    const r = Math.min(255, parseInt(hex.slice(1, 3), 16) + amount);
    const g = Math.min(255, parseInt(hex.slice(3, 5), 16) + amount);
    const b = Math.min(255, parseInt(hex.slice(5, 7), 16) + amount);
    return `${r} ${g} ${b}`;
  };

  const darkenHex = (hex, amount = 40) => {
    if (!hex || hex.length < 7) return null;
    const r = Math.max(0, parseInt(hex.slice(1, 3), 16) - amount);
    const g = Math.max(0, parseInt(hex.slice(3, 5), 16) - amount);
    const b = Math.max(0, parseInt(hex.slice(5, 7), 16) - amount);
    return `${r} ${g} ${b}`;
  };

  const design = bc.design || {};
  const designJSON = JSON.stringify(design);

  // ── Apply ALL design tokens via document.documentElement.style.setProperty ──
  // This is the most reliable method — inline styles on <html> always win over stylesheets
  useEffect(() => {
    const root = document.documentElement;
    // Parse inside the effect to avoid stale closure over `design` object
    const d = JSON.parse(designJSON);

    // Brand color
    const primary = d.primary || d.colors?.primary;
    if (primary) {
      const rgb = hexToRgb(primary);
      if (rgb) {
        root.style.setProperty('--gold', rgb);
        root.style.setProperty('--gold-light', lightenHex(primary, 24));
        root.style.setProperty('--gold-muted', isDark ? darkenHex(primary, 80) : lightenHex(primary, 100));
      }
    } else {
      root.style.removeProperty('--gold');
      root.style.removeProperty('--gold-light');
      root.style.removeProperty('--gold-muted');
    }

    // Surface/text tokens — apply the correct set based on current theme
    const modeTokens = isDark ? (d.dark || {}) : (d.light || {});
    // Backward compat: old flat colors
    const oldColors = d.colors || {};
    const tokens = Object.keys(modeTokens).length > 0 ? modeTokens : oldColors;

    const tokenMap = [
      ['surface', '--surface'], ['card', '--card'],
      ['ink', '--ink'],
    ];
    tokenMap.forEach(([key, cssVar]) => {
      const hex = tokens[key];
      if (hex) {
        const rgb = hexToRgb(hex);
        if (rgb) root.style.setProperty(cssVar, rgb);
      } else {
        root.style.removeProperty(cssVar);
      }
    });

    // ink2 with backward-compat fallback to ink_secondary (single lookup, no override conflict)
    const ink2Val = tokens.ink2 || tokens.ink_secondary;
    if (ink2Val) {
      const rgb = hexToRgb(ink2Val);
      if (rgb) root.style.setProperty('--ink-2', rgb);
    } else {
      root.style.removeProperty('--ink-2');
    }

    // Auto-derive --ink-3 from ink2 (lighter variant for tertiary text)
    const ink2Hex = tokens.ink2 || tokens.ink_secondary;
    if (ink2Hex) {
      root.style.setProperty('--ink-3', isDark ? darkenHex(ink2Hex, 30) : lightenHex(ink2Hex, 40));
    } else {
      root.style.removeProperty('--ink-3');
    }

    // Auto-derive surface-adjacent tokens: --raised, --edge from surface
    const surfaceHex = tokens.surface;
    if (surfaceHex) {
      root.style.setProperty('--raised', isDark ? lightenHex(surfaceHex, 20) : darkenHex(surfaceHex, 13));
      root.style.setProperty('--edge', isDark ? lightenHex(surfaceHex, 35) : darkenHex(surfaceHex, 30));
      root.style.setProperty('--edge-strong', isDark ? lightenHex(surfaceHex, 55) : darkenHex(surfaceHex, 55));
    }

    // Auto-derive --on-gold based on primary brightness
    if (primary) {
      const r = parseInt(primary.slice(1, 3), 16);
      const g = parseInt(primary.slice(3, 5), 16);
      const b = parseInt(primary.slice(5, 7), 16);
      const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
      root.style.setProperty('--on-gold', luminance > 0.55 ? '28 28 30' : '255 255 255');
    }

    // Auto-derive --section-contrast for inverted sections (testimonials)
    // This is NOT linked to --ink; it's a dark bg derived independently from --surface
    const surfHex = tokens.surface || (isDark ? '#000000' : '#F2F2F7');
    if (surfHex) {
      const sr = parseInt(surfHex.slice(1, 3), 16);
      const sg = parseInt(surfHex.slice(3, 5), 16);
      const sb = parseInt(surfHex.slice(5, 7), 16);
      const surfLum = (0.299 * sr + 0.587 * sg + 0.114 * sb) / 255;
      if (surfLum > 0.5) {
        // Light surface → dark contrast section
        root.style.setProperty('--section-contrast', '15 15 15');
        root.style.setProperty('--section-contrast-text', '245 245 247');
        root.style.setProperty('--section-contrast-muted', '174 174 178');
      } else {
        // Dark surface → slightly elevated contrast section
        root.style.setProperty('--section-contrast', lightenHex(surfHex, 18));
        root.style.setProperty('--section-contrast-text', '245 245 247');
        root.style.setProperty('--section-contrast-muted', '142 142 147');
      }
    }

    // Fonts
    if (d.fonts?.heading) {
      root.style.setProperty('--font-heading', `"${d.fonts.heading}", sans-serif`);
    } else {
      root.style.removeProperty('--font-heading');
    }
    if (d.fonts?.body) {
      root.style.setProperty('--font-body', `"${d.fonts.body}", sans-serif`);
    } else {
      root.style.removeProperty('--font-body');
    }

    // Border radius
    if (d.border_radius != null) {
      root.style.setProperty('--radius', `${d.border_radius}px`);
    } else {
      root.style.removeProperty('--radius');
    }

    // Cleanup on unmount — remove all custom properties we set
    return () => {
      ['--gold', '--gold-light', '--gold-muted', '--on-gold',
       '--surface', '--card', '--raised', '--edge', '--edge-strong',
       '--ink', '--ink-2', '--ink-3',
       '--section-contrast', '--section-contrast-text', '--section-contrast-muted',
       '--font-heading', '--font-body', '--radius'].forEach(v => root.style.removeProperty(v));
    };
  }, [designJSON, isDark]);

  // Dynamic Google Fonts loading
  const headingFont = design.fonts?.heading;
  const bodyFont = design.fonts?.body;
  useEffect(() => {
    const fonts = [headingFont, bodyFont].filter(Boolean);
    if (fonts.length === 0) return;
    const families = [...new Set(fonts)].map(f => `family=${f.replace(/ /g, '+')}:wght@300;400;500;600;700;800`).join('&');
    const id = 'dynamic-gfonts';
    let link = document.getElementById(id);
    if (!link) {
      link = document.createElement('link');
      link.id = id;
      link.rel = 'stylesheet';
      document.head.appendChild(link);
    }
    link.href = `https://fonts.googleapis.com/css2?${families}&display=swap`;
  }, [headingFont, bodyFont]);

  // Si ya tenemos la config y la landing está desactivada por el plan (SaaS tiering),
  // redirigimos inmediatamente de forma silenciosa y transparente a la vista de reservas.
  // Ignoramos esta regla si estamos dentro del iframe del Admin (previewConfig activo).
  if (config && !isLandingEnabled && !previewConfig) {
    return <Navigate to="/agendar" replace />;
  }

  if (isLoading && !previewConfig) {
    return (
      <>
        <style>{`
          ${headingFont ? `h1, h2, h3, h4, .font-display { font-family: var(--font-heading) !important; }` : ''}
          ${bodyFont ? `body, p, span, a, button, input { font-family: var(--font-body); }` : ''}
        `}</style>
        <LandingSkeleton />
      </>
    );
  }

  return (
    <div className="min-h-screen bg-surface selection:bg-gold/30 selection:text-ink">
      {/* Font and button style overrides that need CSS selectors */}
      <style>{`
        ${headingFont ? `h1, h2, h3, h4, .font-display { font-family: var(--font-heading) !important; }` : ''}
        ${bodyFont ? `body, p, span, a, button, input { font-family: var(--font-body); }` : ''}
        ${design.border_radius != null ? `.card, .rounded-2xl, .rounded-3xl { border-radius: var(--radius) !important; }` : ''}
        ${design.button_style === 'pill' ? `button { border-radius: 9999px !important; }` : ''}
        ${design.button_style === 'sharp' ? `button { border-radius: 6px !important; }` : ''}
      `}</style>
      <LandingNavbar 
        businessName={businessName} 
        config={bc} 
      />

      <main>
        <LandingHero 
          title={bc.hero?.title}
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
          />
        )}

        {(bc.testimonials_section?.visible !== false) && (
          <LandingTestimonials 
            items={bc.testimonials} 
            title={bc.testimonials_section?.title}
            subtitle={bc.testimonials_section?.subtitle}
          />
        )}

        {(bc.location_section?.visible !== false) && (
          <LandingLocation 
            config={config || {}} 
            locationConfig={bc.location_section || {}}
            title={bc.location_section?.title}
            subtitle={bc.location_section?.subtitle} 
          />
        )}
      </main>

      <LandingContact 
        businessName={bc.navbar?.business_name || businessName} 
        socials={bc.contact_section}
        config={bc}
      />

      <div className="fixed bottom-10 right-10 pointer-events-none opacity-20">
        <div className="w-px h-24 bg-gradient-to-b from-transparent via-gold to-transparent" />
      </div>
    </div>
  );
}
