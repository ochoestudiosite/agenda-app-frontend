// Named imports (not `import * as Sentry`) on purpose: re-exporting the whole
// namespace object across the dynamic-import boundary in main.jsx/ErrorBoundary
// stopped Rollup from tree-shaking unused @sentry/react internals — the chunk
// went from 28KB to 153KB gzip when tried with a namespace re-export. Exporting
// only the two functions actually used keeps tree-shaking effective.
import { init, captureException as _captureException } from '@sentry/react';

// Guards against double-init: main.jsx calls this on idle, but ErrorBoundary
// also calls it before capturing (in case an error fires before idle) — must
// be safe to call from both without re-initializing the client twice.
let initialized = false;

export function initSentry() {
  const dsn = import.meta.env.VITE_SENTRY_DSN;
  if (!import.meta.env.PROD || !dsn || initialized) return;
  initialized = true;

  init({
    dsn,
    environment: import.meta.env.VITE_VERCEL_ENV || import.meta.env.MODE,
    sendDefaultPii: false,
    tracesSampleRate: 0,
    ignoreErrors: [
      /Failed to fetch dynamically imported module/,
      /Importing a module script failed/,
      /is not a valid JavaScript MIME type/,
      /error loading dynamically imported module/,
      /ResizeObserver loop/,
    ],
    denyUrls: [
      /extensions\//i,
      /^chrome:\/\//i,
      /^chrome-extension:\/\//i,
      /^moz-extension:\/\//i,
      /^safari-extension:\/\//i,
    ],
  });
}

export function captureException(error, context) {
  if (!initialized) return;
  _captureException(error, context);
}
