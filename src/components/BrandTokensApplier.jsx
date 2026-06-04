import { useEffect, useState } from 'react';
import { useConfig } from '../hooks/useConfig';
import { useTheme } from '../context/ThemeContext';

// Mirror of the admin-origin allowlist used elsewhere in the tenant SPA.
// Duplicated locally to keep this module standalone and importable from App.
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
    const sub = host.slice(0, -(publicDomain.length + 1));
    return sub.length > 0 && !sub.includes('.');
  } catch { return false; }
}

// Single applier for the tenant's runtime design tokens. Previously this
// lived inside Home.jsx, which meant every token was *removed* the instant
// the user navigated away (Home unmounted → cleanup ran). The result was that
// /agendar and /gestionar reverted to the default theme and the brand felt
// inconsistent across pages.
//
// Lifting this to the App level keeps:
//   - --gold / --gold-light / --gold-muted / --on-gold     (brand)
//   - --surface / --card / --raised / --edge / --edge-strong (surfaces)
//   - --ink / --ink-2 / --ink-3                              (text)
//   - --section-contrast / -text / -muted                    (inverted bands)
//   - --font-heading / --font-body                           (typography)
//   - --radius                                               (rounding)
//   - inline <style> for h1-h4 / body font-family + button shapes
// applied for the lifetime of the SPA. There is no unmount cleanup because
// the brand should persist as long as the user is inside the tenant.

function hexToRgb(hex) {
  if (!hex || hex.length < 7) return null;
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `${r} ${g} ${b}`;
}
function lightenHex(hex, amount = 30) {
  if (!hex || hex.length < 7) return null;
  const r = Math.min(255, parseInt(hex.slice(1, 3), 16) + amount);
  const g = Math.min(255, parseInt(hex.slice(3, 5), 16) + amount);
  const b = Math.min(255, parseInt(hex.slice(5, 7), 16) + amount);
  return `${r} ${g} ${b}`;
}
function darkenHex(hex, amount = 40) {
  if (!hex || hex.length < 7) return null;
  const r = Math.max(0, parseInt(hex.slice(1, 3), 16) - amount);
  const g = Math.max(0, parseInt(hex.slice(3, 5), 16) - amount);
  const b = Math.max(0, parseInt(hex.slice(5, 7), 16) - amount);
  return `${r} ${g} ${b}`;
}

export default function BrandTokensApplier() {
  const { data: config } = useConfig();
  const { isDark }       = useTheme();
  // The admin Landing Editor pushes live preview updates via postMessage. We
  // hold the latest preview design here so the iframe reflects colour / font
  // / radius changes the moment the user moves a slider — the saved config
  // takes over again as soon as the preview is cleared.
  const [previewDesign, setPreviewDesign] = useState(null);

  useEffect(() => {
    function onMessage(e) {
      if (!isAllowedAdminOrigin(e.origin)) return;
      if (e.data?.type === 'LANDING_PREVIEW') {
        setPreviewDesign(e.data?.config?.design || null);
      }
    }
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, []);

  // Pull the design block from the server-merged landing_config (works whether
  // landing is premium-enabled or not — the server returns the same shape).
  // Fall back to a thin object built from business_settings columns so the
  // brand colour is still applied when there is no landing_config at all.
  const landing = config?.landing || config?.landing_config || {};
  const savedDesign = landing.design || {};
  const design = previewDesign || savedDesign;
  const headingFont = design?.fonts?.heading;
  const bodyFont    = design?.fonts?.body;
  const designJSON  = JSON.stringify(design);
  const primaryFromColumn = config?.primary_color;

  // Stable string for the style-tag effect dependency to avoid stale closures.
  const styleKey = JSON.stringify({
    headingFont, bodyFont,
    radius: design?.border_radius,
    button: design?.button_style,
  });

  useEffect(() => {
    const root = document.documentElement;
    const d = JSON.parse(designJSON);

    // ── Brand colour ─────────────────────────────────────────────────────
    // design.primary is the merged landing identity (which mirrors the
    // business_settings.primary_color column). Fall back to the column
    // directly when there's no landing data — keeps booking/manage pages
    // branded even when landing is not enabled.
    const primary = d.primary || d.colors?.primary || primaryFromColumn;
    if (primary && /^#[0-9A-Fa-f]{6}$/.test(primary)) {
      const r = parseInt(primary.slice(1, 3), 16);
      const g = parseInt(primary.slice(3, 5), 16);
      const b = parseInt(primary.slice(5, 7), 16);

      let dr = r, dg = g, db = b;
      if (isDark) {
        // Solo aclara colores muy oscuros (lum < 0.12) que serían invisibles
        // en fondos dark. Colores ya saturados (rojo, teal, azul) se respetan.
        const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
        if (lum < 0.12) {
          dr = Math.min(255, r + 68);
          dg = Math.min(255, g + 68);
          db = Math.min(255, b + 68);
        }
      }
      const rl = Math.min(255, dr + 20);
      const gl = Math.min(255, dg + 20);
      const bl = Math.min(255, db + 20);

      root.style.setProperty('--gold',       `${dr} ${dg} ${db}`);
      root.style.setProperty('--gold-light', `${rl} ${gl} ${bl}`);
      root.style.setProperty('--gold-muted', isDark ? darkenHex(primary, 80) : lightenHex(primary, 100));

      // On-gold: pick text colour with highest WCAG contrast against the applied gold.
      // Computed from the dark-mode-adjusted (dr,dg,db), not the original hex, so
      // the lightened dark-mode gold (~#44FCbe) correctly gets dark text instead of white.
      const _lin = c => { const s = c / 255; return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4); };
      const goldLum  = 0.2126 * _lin(dr) + 0.7152 * _lin(dg) + 0.0722 * _lin(db);
      const contrast = (l1, l2) => { const [hi, lo] = l1 > l2 ? [l1, l2] : [l2, l1]; return (hi + 0.05) / (lo + 0.05); };
      const useDark  = contrast(goldLum, 0.018) >= contrast(goldLum, 1.0); // 0.018 ≈ lum of rgb(28,28,30)
      root.style.setProperty('--on-gold', useDark ? '28 28 30' : '255 255 255');
    }

    // ── Surface / text tokens ────────────────────────────────────────────
    const modeTokens = isDark ? (d.dark || {}) : (d.light || {});
    const oldColors = d.colors || {};
    const tokens = Object.keys(modeTokens).length > 0 ? modeTokens : oldColors;

    [['surface', '--surface'], ['card', '--card'], ['ink', '--ink']].forEach(([k, cssVar]) => {
      const hex = tokens[k];
      if (hex) {
        const rgb = hexToRgb(hex);
        if (rgb) root.style.setProperty(cssVar, rgb);
      } else {
        root.style.removeProperty(cssVar);
      }
    });

    const ink2Val = tokens.ink2 || tokens.ink_secondary;
    if (ink2Val) {
      const rgb = hexToRgb(ink2Val);
      if (rgb) root.style.setProperty('--ink-2', rgb);
      root.style.setProperty('--ink-3', isDark ? darkenHex(ink2Val, 30) : lightenHex(ink2Val, 40));
    } else {
      root.style.removeProperty('--ink-2');
      root.style.removeProperty('--ink-3');
    }

    const surfaceHex = tokens.surface;
    if (surfaceHex) {
      root.style.setProperty('--raised',       isDark ? lightenHex(surfaceHex, 20) : darkenHex(surfaceHex, 13));
      root.style.setProperty('--edge',         isDark ? lightenHex(surfaceHex, 35) : darkenHex(surfaceHex, 30));
      root.style.setProperty('--edge-strong',  isDark ? lightenHex(surfaceHex, 55) : darkenHex(surfaceHex, 55));
    }

    // ── Section contrast (testimonials inverted band) ────────────────────
    const surfHex = tokens.surface || (isDark ? '#000000' : '#F2F2F7');
    if (surfHex) {
      const sr = parseInt(surfHex.slice(1, 3), 16);
      const sg = parseInt(surfHex.slice(3, 5), 16);
      const sb = parseInt(surfHex.slice(5, 7), 16);
      const surfLum = (0.299 * sr + 0.587 * sg + 0.114 * sb) / 255;
      if (surfLum > 0.5) {
        root.style.setProperty('--section-contrast',       '15 15 15');
        root.style.setProperty('--section-contrast-text',  '245 245 247');
        root.style.setProperty('--section-contrast-muted', '174 174 178');
      } else {
        root.style.setProperty('--section-contrast',       lightenHex(surfHex, 18));
        root.style.setProperty('--section-contrast-text',  '245 245 247');
        root.style.setProperty('--section-contrast-muted', '142 142 147');
      }
    }

    // ── Fonts + radius ───────────────────────────────────────────────────
    if (d.fonts?.heading) root.style.setProperty('--font-heading', `"${d.fonts.heading}", sans-serif`);
    else                  root.style.removeProperty('--font-heading');

    if (d.fonts?.body) root.style.setProperty('--font-body', `"${d.fonts.body}", sans-serif`);
    else               root.style.removeProperty('--font-body');

    if (d.border_radius != null) root.style.setProperty('--radius', `${d.border_radius}px`);
    else                          root.style.removeProperty('--radius');

    // No cleanup — the brand stays applied for the lifetime of the SPA.
  }, [designJSON, primaryFromColumn, isDark]);

  // ── Google Fonts (dynamic <link> in <head>) ──────────────────────────────
  useEffect(() => {
    const fonts = [headingFont, bodyFont].filter(Boolean);
    if (fonts.length === 0) return;
    const families = [...new Set(fonts)]
      .map(f => `family=${f.replace(/ /g, '+')}:wght@300;400;500;600;700;800`)
      .join('&');
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

  // ── Font-family + button shape overrides ────────────────────────────────
  // Inject a <style> tag in head so the overrides survive route changes.
  useEffect(() => {
    const id = 'tenant-style-overrides';
    let tag = document.getElementById(id);
    if (!tag) {
      tag = document.createElement('style');
      tag.id = id;
      document.head.appendChild(tag);
    }
    const d = JSON.parse(designJSON);
    tag.textContent = [
      d.fonts?.heading ? `h1, h2, h3, h4, .font-display { font-family: var(--font-heading) !important; }` : '',
      d.fonts?.body    ? `body, p, span, a, button, input { font-family: var(--font-body); }` : '',
      d.border_radius != null ? `.card, .rounded-2xl, .rounded-3xl { border-radius: var(--radius) !important; }` : '',
      d.button_style === 'pill'  ? `button { border-radius: 9999px !important; }` : '',
      d.button_style === 'sharp' ? `button { border-radius: 6px !important; }`    : '',
    ].filter(Boolean).join('\n');
  }, [styleKey, designJSON]);

  return null;
}
