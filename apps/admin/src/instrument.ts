import * as Sentry from '@sentry/react';

const dsn = import.meta.env.VITE_SENTRY_DSN;
// Admin screens show customer PII: no Session Replay, no default PII.
Sentry.init({
  dsn,
  enabled: !!dsn,
  environment: import.meta.env.DEV ? 'development' : 'production',
  integrations: [Sentry.browserTracingIntegration()],
  tracesSampleRate: import.meta.env.DEV ? 1.0 : 0.1,
  tracePropagationTargets: [/^\//, /supabase\.co/],
  sendDefaultPii: false,
});
export { Sentry };
