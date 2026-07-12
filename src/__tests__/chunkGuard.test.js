// chunkGuard: recuperación transparente de fallos de carga de chunks tras un
// deploy de Vercel (los assets con hash viejo dejan de existir).
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// __APP_VERSION__ es un define de Vite y también se inyecta en los tests; si
// no estuviera definido, el util cae a 'unknown' — igual que aquí.
const CURRENT_V  = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : 'unknown';
const RELOAD_KEY = 'c24_chunk_reload';

const reloadMock       = vi.fn();
const originalLocation = window.location;

// El flag _reloading vive en el módulo: import fresco por test para aislarlo.
async function freshGuard() {
  vi.resetModules();
  return await import('../utils/chunkGuard');
}

beforeEach(() => {
  sessionStorage.clear();
  reloadMock.mockClear();
  Object.defineProperty(window, 'location', {
    value: { ...originalLocation, reload: reloadMock },
    configurable: true,
  });
});

afterEach(() => {
  Object.defineProperty(window, 'location', { value: originalLocation, configurable: true });
  vi.restoreAllMocks();
});

describe('isChunkLoadError', () => {
  it('reconoce los mensajes de fallo de chunk de todos los navegadores y de Vite', async () => {
    const { isChunkLoadError } = await freshGuard();
    const mensajes = [
      'Failed to fetch dynamically imported module: https://x/assets/Page-abc.js', // Chrome/Edge
      'error loading dynamically imported module',                                  // Firefox
      'Importing a module script failed.',                                          // Safari
      "'text/html' is not a valid JavaScript MIME type",                            // rewrite SPA sirvió index.html
      'Unable to preload CSS for /assets/Page-abc.css',                             // preload de CSS de Vite
    ];
    for (const m of mensajes) expect(isChunkLoadError(m), m).toBe(true);
  });

  it('no clasifica errores normales ni valores no-string', async () => {
    const { isChunkLoadError } = await freshGuard();
    expect(isChunkLoadError('Cannot read properties of undefined')).toBe(false);
    expect(isChunkLoadError(undefined)).toBe(false);
    expect(isChunkLoadError(null)).toBe(false);
    expect(isChunkLoadError(42)).toBe(false);
  });
});

describe('attemptChunkReload', () => {
  it('primera vez: recarga, registra versión+timestamp y devuelve true', async () => {
    const { attemptChunkReload } = await freshGuard();
    expect(attemptChunkReload()).toBe(true);
    expect(reloadMock).toHaveBeenCalledTimes(1);
    const rec = JSON.parse(sessionStorage.getItem(RELOAD_KEY));
    expect(rec.v).toBe(CURRENT_V);
    expect(rec.t).toBeTypeOf('number');
  });

  it('anti-bucle: misma versión recargada hace <60s devuelve false sin recargar', async () => {
    sessionStorage.setItem(RELOAD_KEY, JSON.stringify({ v: CURRENT_V, t: Date.now() }));
    const { attemptChunkReload } = await freshGuard();
    expect(attemptChunkReload()).toBe(false);
    expect(reloadMock).not.toHaveBeenCalled();
  });

  it('versión distinta (deploy nuevo con la pestaña abierta): permite recargar', async () => {
    sessionStorage.setItem(RELOAD_KEY, JSON.stringify({ v: 'deploy-anterior', t: Date.now() }));
    const { attemptChunkReload } = await freshGuard();
    expect(attemptChunkReload()).toBe(true);
    expect(reloadMock).toHaveBeenCalledTimes(1);
  });

  it('registro viejo (>60s): permite reintentar (la propagación del CDN ya terminó)', async () => {
    sessionStorage.setItem(RELOAD_KEY, JSON.stringify({ v: CURRENT_V, t: Date.now() - 61_000 }));
    const { attemptChunkReload } = await freshGuard();
    expect(attemptChunkReload()).toBe(true);
    expect(reloadMock).toHaveBeenCalledTimes(1);
  });

  it('valor legacy no-JSON en el guard: se ignora y recarga', async () => {
    sessionStorage.setItem(RELOAD_KEY, 'abc123');
    const { attemptChunkReload } = await freshGuard();
    expect(attemptChunkReload()).toBe(true);
  });

  it('reload ya en curso: llamadas repetidas devuelven true sin recargar otra vez', async () => {
    const { attemptChunkReload } = await freshGuard();
    expect(attemptChunkReload()).toBe(true);
    expect(attemptChunkReload()).toBe(true);
    expect(reloadMock).toHaveBeenCalledTimes(1);
  });

  it('sessionStorage inservible: devuelve false sin recargar (sin guard no hay anti-bucle)', async () => {
    const { attemptChunkReload } = await freshGuard();
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('QuotaExceededError'); });
    expect(attemptChunkReload()).toBe(false);
    expect(reloadMock).not.toHaveBeenCalled();
  });

  it('reload cancelado (usuario descartó el beforeunload de otra vista con cambios sin guardar): ' +
     'no se queda mudo para siempre — libera el guard en memoria tras el margen de gracia', async () => {
    // reload() en jsdom no navega de verdad — simula exactamente lo que pasa
    // cuando el usuario responde "Cancelar" al diálogo nativo (la página sigue viva).
    vi.useFakeTimers();
    const { attemptChunkReload } = await freshGuard();

    expect(attemptChunkReload()).toBe(true); // primer intento: reload real
    expect(reloadMock).toHaveBeenCalledTimes(1);

    // Antes de que pase el margen de gracia: _reloading sigue en true → no reintenta.
    vi.advanceTimersByTime(1000);
    expect(attemptChunkReload()).toBe(true);
    expect(reloadMock).toHaveBeenCalledTimes(1); // no se llamó otra vez a reload()

    // Pasado el margen de gracia, _reloading se liberó — pero el guard de
    // sessionStorage (misma versión, <60s) sigue bloqueando un reload real
    // inmediato: debe devolver false (fallback visible), NO true-sin-hacer-nada.
    vi.advanceTimersByTime(2000); // total 3000ms > RELOAD_GRACE_MS (2500ms)
    expect(attemptChunkReload()).toBe(false);
    expect(reloadMock).toHaveBeenCalledTimes(1);

    vi.useRealTimers();
  });
});

describe('installChunkReloadRecovery (vite:preloadError)', () => {
  it('previene el re-throw de Vite y recarga transparentemente', async () => {
    const { installChunkReloadRecovery } = await freshGuard();
    const cleanup = installChunkReloadRecovery();
    const event = new Event('vite:preloadError', { cancelable: true });
    window.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
    expect(reloadMock).toHaveBeenCalledTimes(1);
    cleanup();
  });

  it('anti-bucle activo: no previene el evento (el error sigue su curso al ErrorBoundary)', async () => {
    sessionStorage.setItem(RELOAD_KEY, JSON.stringify({ v: CURRENT_V, t: Date.now() }));
    const { installChunkReloadRecovery } = await freshGuard();
    const cleanup = installChunkReloadRecovery();
    const event = new Event('vite:preloadError', { cancelable: true });
    window.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(false);
    expect(reloadMock).not.toHaveBeenCalled();
    cleanup();
  });
});
