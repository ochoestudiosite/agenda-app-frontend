import { Component } from 'react';
import { reportError } from '../utils/errorReporter';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    const componentStack = info?.componentStack || '';
    reportError({
      type:      'react_error',
      message:   error.message,
      stack:     `${error.stack || ''}\n\nComponent stack:${componentStack}`,
      component: componentStack.trim().split('\n')[0]?.replace(/^\s*at\s+/, '').trim(),
    });
  }

  render() {
    if (!this.state.hasError) return this.props.children;

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
