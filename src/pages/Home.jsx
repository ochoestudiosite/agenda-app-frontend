import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../services/api';
import LandingNavbar from '../components/landing/LandingNavbar';
import LandingHero from '../components/landing/LandingHero';
import LandingServices from '../components/landing/LandingServices';
import LandingStaff from '../components/landing/LandingStaff';
import LandingTestimonials from '../components/landing/LandingTestimonials';
import LandingLocation from '../components/landing/LandingLocation';
import LandingContact from '../components/landing/LandingContact';

export default function Home() {
  const { data: config } = useQuery({ 
    queryKey: ['config'], 
    queryFn: api.getConfig 
  });

  const { data: servicesData } = useQuery({ 
    queryKey: ['services'], 
    queryFn: api.getServices 
  });

  const { data: staffData } = useQuery({ 
    queryKey: ['specialists'], 
    queryFn: api.getSpecialists 
  });

  const [previewConfig, setPreviewConfig] = useState(null);

  // Listen for live preview updates from admin dashboard
  useEffect(() => {
    const handleMessage = (event) => {
      if (event.data?.type === 'LANDING_PREVIEW') {
        setPreviewConfig(event.data.config);
      }
    };
    window.addEventListener('message', handleMessage);
    
    // Notify parent that we are ready to receive preview data
    if (window.parent !== window) {
      window.parent.postMessage({ type: 'LANDING_READY' }, '*');
    }

    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const businessName = config?.business_name || 'Cita24';
  
  // Robust parsing of landing_config
  let savedConfig = config?.landing || config?.landing_config || {};
  if (typeof savedConfig === 'string') {
    try { savedConfig = JSON.parse(savedConfig); } catch { savedConfig = {}; }
  }

  const bc = previewConfig || savedConfig;
  const services = servicesData?.services || servicesData?.data || [];
  const staff = staffData?.specialists || staffData?.data || [];

  // Convert hex to RGB triplet for CSS variable system
  const hexToRgb = (hex) => {
    if (!hex || hex.length < 7) return null;
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `${r} ${g} ${b}`;
  };

  // Lighten a hex color for hover states
  const lightenHex = (hex, amount = 30) => {
    if (!hex || hex.length < 7) return null;
    const r = Math.min(255, parseInt(hex.slice(1, 3), 16) + amount);
    const g = Math.min(255, parseInt(hex.slice(3, 5), 16) + amount);
    const b = Math.min(255, parseInt(hex.slice(5, 7), 16) + amount);
    return `${r} ${g} ${b}`;
  };

  const design = bc.design || {};

  // Brand color (shared across themes) → --gold, --gold-light
  const primary = design.primary || design.colors?.primary || null;
  const designStyle = {};
  if (primary) {
    const rgb = hexToRgb(primary);
    if (rgb) {
      designStyle['--gold'] = rgb;
      designStyle['--gold-light'] = lightenHex(primary, 24);
    }
  }

  // Per-theme surface/text tokens
  const lightTokens = design.light || {};
  const darkTokens  = design.dark  || {};
  // Backward compat: old flat colors structure
  const oldColors = design.colors || {};

  const buildTokenCSS = (tokens, fallbacks = {}) => {
    const lines = [];
    const map = [['surface','--surface'],['card','--card'],['ink','--ink'],['ink2','--ink-2'],['ink_secondary','--ink-2']];
    map.forEach(([key, cssVar]) => {
      const hex = tokens[key] || fallbacks[key];
      if (hex) { const rgb = hexToRgb(hex); if (rgb) lines.push(`${cssVar}: ${rgb};`); }
    });
    return lines.join(' ');
  };

  const hasLight = Object.keys(lightTokens).length > 0;
  const hasDark  = Object.keys(darkTokens).length > 0;
  const hasOld   = oldColors.surface || oldColors.card || oldColors.ink;

  // Fonts
  const headingFont = design.fonts?.heading;
  const bodyFont = design.fonts?.body;
  if (headingFont) designStyle['--font-heading'] = `"${headingFont}", sans-serif`;
  if (bodyFont)    designStyle['--font-body'] = `"${bodyFont}", sans-serif`;

  // Border radius
  if (design.border_radius != null) designStyle['--radius'] = `${design.border_radius}px`;

  // Dynamic Google Fonts loading
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

  return (
    <div className="min-h-screen bg-surface selection:bg-gold/30 selection:text-ink" style={designStyle}>
      {/* Inject per-theme design tokens + font/radius overrides */}
      <style>{`
        ${hasLight ? `:root { ${buildTokenCSS(lightTokens)} }` : hasOld ? `:root { ${buildTokenCSS(oldColors)} }` : ''}
        ${hasDark  ? `.dark { ${buildTokenCSS(darkTokens)} }` : ''}
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
