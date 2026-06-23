import * as Sentry from "@sentry/node";

Sentry.init({
  dsn: process.env.SENTRY_DNS!,
  sendDefaultPii: true,
  enableLogs: true,
});
