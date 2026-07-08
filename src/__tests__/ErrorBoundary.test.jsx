import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import ErrorBoundary from '../components/ErrorBoundary';

const { initSentry, captureException } = vi.hoisted(() => ({
  initSentry:       vi.fn(),
  captureException: vi.fn(),
}));
vi.mock('../sentry', () => ({ initSentry, captureException }));
vi.mock('../utils/errorReporter', () => ({ reportError: vi.fn() }));

function Boom() {
  throw new Error('boom');
}

describe('ErrorBoundary', () => {
  beforeEach(() => {
    initSentry.mockClear();
    captureException.mockClear();
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
});
