import * as Sentry from '@sentry/react-native';

const dsn = process.env.EXPO_PUBLIC_SENTRY_DSN;
// Privacy: customers' business data is financial and must stay on-device, so no Session Replay,
// no default PII, no logs. Errors + light tracing only.
Sentry.init({
  dsn,
  enabled: !!dsn,
  environment: __DEV__ ? 'development' : 'production',
  sendDefaultPii: false,
  tracesSampleRate: __DEV__ ? 1.0 : 0.1,
  enableLogs: false,
});
export { Sentry };
