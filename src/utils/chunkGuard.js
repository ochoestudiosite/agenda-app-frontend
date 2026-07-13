// Recuperación transparente de fallos de carga de chunks tras un deploy.
// Cuando Vercel publica un build nuevo, los assets con hash viejo dejan de
// existir; el rewrite SPA responde index.html (text/html) para esas URLs y el
// import() dinámico falla. No es un bug de código: se resuelve recargando para
// obtener el index.html nuevo. Este módulo centraliza la detección y el
// auto-reload — única fuente de verdad para ErrorBoundary y errorReporter.

const PATTERNS = [
  'Failed to fetch dynamically imported module', // Chrome / Edge
  'error loading dynamically imported module',   // Firefox
  'Importing a module script failed',            // Safari
  'is not a valid JavaScript MIME type',         // rewrite SPA devolvió index.html por un asset viejo
  'Unable to preload CSS',                       // helper de preload de Vite: CSS de un chunk lazy 404
];

export function isChunkLoadError(msg) {
  return typeof msg === 'string' && PATTERNS.some((p) => msg.includes(p));
}

const RELOAD_KEY = 'c24_chunk_reload';
// Anti-bucle: si esta misma versión ya recargó hace <60s, no reintentar todavía
// (el build nuevo también está roto, o el CDN sigue sirviendo el HTML viejo).
// Ventana por tiempo — no "una vez por versión" — para que el cliente se
// recupere solo cuando la propagación del deploy termina.
const RETRY_WINDOW_MS = 60_000;

let _reloading = false;
// Si reload() no llega a descargar la página (el usuario canceló el diálogo
// nativo "¿Salir sin guardar?" de un beforeunload de otra vista, o algún
// entorno embebido bloquea la navegación), _reloading no debe quedar en true
// para siempre: eso silenciaría cualquier intento futuro (attemptChunkReload
// devolvería true sin hacer nada). Se libera sola tras un margen corto; el
// guard de sessionStorage (versión+60s) sigue vigente y evita que ese
// reintento dispare un segundo reload real de inmediato — solo permite que
// vuelva a evaluarse en vez de quedar mudo.
const RELOAD_GRACE_MS = 2500;

// Recarga la página si el guard lo permite. Devuelve true si el reload quedó
// iniciado (o ya estaba en curso); false si el anti-bucle lo bloqueó y el
// llamador debe mostrar su fallback.
export function attemptChunkReload() {
  if (_reloading) return true;

  const myVersion = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : 'unknown';
  let last = null;
  try {
    last = JSON.parse(sessionStorage.getItem(RELOAD_KEY));
  } catch { /* valor legacy o corrupto → tratar como sin registro */ }

  if (last && last.v === myVersion && Date.now() - last.t < RETRY_WINDOW_MS) return false;

  try {
    sessionStorage.setItem(RELOAD_KEY, JSON.stringify({ v: myVersion, t: Date.now() }));
  } catch {
    // Sin storage no hay guard anti-bucle: no auto-recargar a ciegas.
    return false;
  }

  _reloading = true;
  window.location.reload();
  setTimeout(() => { _reloading = false; }, RELOAD_GRACE_MS);
  return true;
}

// Vite dispara 'vite:preloadError' cuando falla una dependencia (JS o CSS) de
// un import() dinámico. NO se llama a preventDefault(): si se suprime el
// re-throw, la promesa interna de __vitePreload se resuelve con `undefined`
// en vez de rechazar, y React.lazy() (que await-ea esa misma promesa) intenta
// leer `.default` de ese undefined antes de que el reload real complete —
// TypeError "Cannot read properties of undefined (reading 'default')", que
// isChunkLoadError no reconoce, así que el ErrorBoundary lo reporta a Sentry
// y muestra el fallback (bug real visto en producción). Dejando que Vite
// relance el error original, React.lazy() rechaza con el mensaje nativo (que
// SÍ matchea isChunkLoadError) y el ErrorBoundary ya lo maneja transparente:
// ve _reloading=true (seteado por attemptChunkReload más abajo) y no hace
// nada más. Devuelve una función de cleanup (usada en tests).
export function installChunkReloadRecovery() {
  const onPreloadError = () => {
    attemptChunkReload();
    // Si el anti-bucle lo bloqueó, Vite relanza el error y el ErrorBoundary
    // muestra el fallback con botón de recarga manual.
  };
  window.addEventListener('vite:preloadError', onPreloadError);
  return () => window.removeEventListener('vite:preloadError', onPreloadError);
}
