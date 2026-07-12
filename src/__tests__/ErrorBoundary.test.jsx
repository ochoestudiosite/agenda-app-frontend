import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import ErrorBoundary from '../components/ErrorBoundary';
import { attemptChunkReload } from '../utils/chunkGuard';
import { reportError } from '../utils/errorReporter';

const { initSentry, captureException } = vi.hoisted(() => ({
  initSentry:       vi.fn(),
  captureException: vi.fn(),
}));
vi.mock('../sentry', () => ({ initSentry, captureException }));
vi.mock('../utils/errorReporter', () => ({ reportError: vi.fn() }));
// isChunkLoadError real (probamos la clasificación), attemptChunkReload controlado.
vi.mock('../utils/chunkGuard', async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, attemptChunkReload: vi.fn() };
});

function Boom({ message = 'boom' }) {
  throw new Error(message);
}

describe('ErrorBoundary', () => {
  beforeEach(() => {
    initSentry.mockClear();
    captureException.mockClear();
    reportError.mockClear();
    attemptChunkReload.mockReset();
  });

  it('renders children normally when nothing throws', () => {
    render(<ErrorBoundary><div>ok</div></ErrorBoundary>);
    expect(screen.getByText('ok')).toBeInTheDocument();
  });

  it('catches a render error, shows the fallback, and reports it via a dynamic import of ../sentry', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    render(<ErrorBoundary><Boom /></ErrorBoundary>);

    expect(screen.getByText('Algo salió mal')).toBeInTheDocument();

    // captureException/initSentry come from the dynamic `import('../sentry')`
    // inside componentDidCatch — must await the microtask before asserting.
    await waitFor(() => {
      expect(initSentry).toHaveBeenCalledTimes(1);
      expect(captureException).toHaveBeenCalledTimes(1);
    });
    const [error, context] = captureException.mock.calls[0];
    expect(error.message).toBe('boom');
    expect(context.contexts.react.componentStack).toEqual(expect.any(String));

    errorSpy.mockRestore();
  });

  // Chunk errors tras un deploy: recuperación transparente, sin fallback ni reporte.
  it('chunk error con reload disponible: no muestra nada, recarga y no reporta', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    attemptChunkReload.mockReturnValue(true);
    const { container } = render(
      <ErrorBoundary><Boom message="Failed to fetch dynamically imported module: /assets/Booking-abc.js" /></ErrorBoundary>
    );
    expect(attemptChunkReload).toHaveBeenCalled();
    expect(container.firstChild).toBeNull();
    expect(reportError).not.toHaveBeenCalled();
    expect(captureException).not.toHaveBeenCalled();
    errorSpy.mockRestore();
  });

  it('"Unable to preload CSS" también es chunk error (regresión: antes mostraba el fallback)', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    attemptChunkReload.mockReturnValue(true);
    const { container } = render(
      <ErrorBoundary><Boom message="Unable to preload CSS for /assets/Booking-abc.css" /></ErrorBoundary>
    );
    expect(attemptChunkReload).toHaveBeenCalled();
    expect(container.firstChild).toBeNull();
    expect(reportError).not.toHaveBeenCalled();
    errorSpy.mockRestore();
  });

  it('anti-bucle activo: muestra el fallback pero sigue sin reportar', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    attemptChunkReload.mockReturnValue(false);
    render(
      <ErrorBoundary><Boom message="Failed to fetch dynamically imported module: /assets/x.js" /></ErrorBoundary>
    );
    expect(screen.getByText('Algo salió mal')).toBeInTheDocument();
    expect(reportError).not.toHaveBeenCalled();
    expect(captureException).not.toHaveBeenCalled();
    errorSpy.mockRestore();
  });
});
