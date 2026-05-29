import { Component } from 'react';
import { reportError } from '../utils/errorReporter';
import { Sentry } from '../sentry';

function isChunkLoadError(msg) {
  return typeof msg === 'string' && (
    msg.includes('Failed to fetch dynamically imported module') ||
    msg.includes('Importing a module script failed') ||
    msg.includes('is not a valid JavaScript MIME type') ||
    msg.includes('error loading dynamically imported module')
  );
}

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, isChunkError: false };
  }

  static getDerivedStateFromError(error) {
    return {
      hasError:     true,
      isChunkError: isChunkLoadError(error?.message),
    };
  }

  componentDidCatch(error, info) {
    if (isChunkLoadError(error?.message)) return;

    const componentStack = info?.componentStack || '';
    Sentry.captureException(error, { contexts: { react: { componentStack } } });
    reportError({
      type:      'react_error',
      message:   error.message,
      stack:     `${error.stack || ''}\n\nComponent stack:${componentStack}`,
      component: componentStack.trim().split('\n')[0]?.replace(/^\s*at\s+/, '').trim(),
    });
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    // Booking flow is stateless — auto-reload is safe and seamless for clients.
    if (this.state.isChunkError) {
      const RELOAD_KEY  = 'cita24_booking_chunk_reload_v';
      const myVersion   = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : 'unknown';
      const lastVersion = sessionStorage.getItem(RELOAD_KEY);
      if (lastVersion !== myVersion) {
        sessionStorage.setItem(RELOAD_KEY, myVersion);
        window.location.reload();
        return null;
      }
    }

    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#FAFAFA',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Inter", sans-serif',
        padding: '24px',
      }}>
        <div style={{ textAlign: 'center', maxWidth: 360 }}>

          <div style={{
            width: 52, height: 52, borderRadius: 14, margin: '0 auto 20px',
            background: '#FEF2F2', border: '1px solid #FECACA',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
              <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
          </div>

          <p style={{ fontSize: 17, fontWeight: 700, color: '#111827', margin: '0 0 8px', letterSpacing: '-0.3px' }}>
            Algo salió mal
          </p>
          <p style={{ fontSize: 13.5, color: '#6B7280', margin: '0 0 28px', lineHeight: 1.65 }}>
            Ocurrió un error inesperado.<br/>Recarga la página para continuar.
          </p>

          <button
            onClick={() => window.location.reload()}
            style={{
              background: '#00B87A', color: '#fff',
              border: 'none', borderRadius: 9999,
              padding: '12px 32px', fontSize: 14, fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Recargar página
          </button>
        </div>
      </div>
    );
  }
}
