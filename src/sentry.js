import * as Sentry from '@sentry/react';

export function initSentry() {
  const dsn = import.meta.env.VITE_SENTRY_DSN;
  if (!import.meta.env.PROD || !dsn) return;

  Sentry.init({
    dsn,
    environment: import.meta.env.VITE_VERCEL_ENV || import.meta.env.MODE,
    sendDefaultPii: false,
    tracesSampleRate: 0,
    ignoreErrors: [
      /Failed to fetch dynamically imported module/,
      /Importing a module script failed/,
      /is not a valid JavaScript MIME type/,
      /error loading dynamically imported module/,
    ],
  });
}

export { Sentry };
