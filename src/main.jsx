import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from './App';
import ErrorBoundary from './components/ErrorBoundary';
import { initErrorReporter } from './utils/errorReporter';
import '@fontsource/inter/400.css';
import '@fontsource/inter/500.css';
import '@fontsource/inter/600.css';
import '@fontsource/dm-mono/400.css';
import '@fontsource/dm-mono/500.css';
import './index.css';

// Deferred: @sentry/react (~28KB gzip) is dynamically imported on idle instead
// of statically here, so it never blocks first paint. ErrorBoundary imports the
// same module and re-runs initSentry() (idempotent) if an error fires before
// this idle callback does, so no error window is actually missed.
const deferInit = () => import('./sentry').then(m => m.initSentry());
if ('requestIdleCallback' in window) requestIdleCallback(deferInit);
else setTimeout(deferInit, 1);

initErrorReporter();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      gcTime: 10 * 60_000,
      retry: 1,
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
    },
    mutations: { retry: 0 },
  },
});

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </QueryClientProvider>
    </ErrorBoundary>
  </React.StrictMode>,
);
