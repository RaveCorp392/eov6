// sentry.client.config.ts
// Browser-side Sentry for EOV6 - useful-first, light sampling, secondary privacy.
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN || "",
  tracesSampleRate: 0.1, // 10% interactions; bump temporarily if chasing perf
  replaysSessionSampleRate: 0.0,
  replaysOnErrorSampleRate: 0.0,
  environment:
    (process.env.NEXT_PUBLIC_VERCEL_ENV as string) ||
    (process.env.NODE_ENV as string) ||
    "development",
  initialScope: {
    tags: { app: "eov6", surface: "web-client" },
  },
  beforeSend(event) {
    try {
      const mask = (url?: string) =>
        url ? url.replace(/(\/s\/)(\d{6})(\b|\/)/g, "$1[code]$3") : url;
      if (event.request?.url) event.request.url = mask(event.request.url);
      if (event.request?.headers?.Referer)
        event.request.headers.Referer = mask(String(event.request.headers.Referer));
      if (event.request?.headers?.referer)
        event.request.headers.referer = mask(String(event.request.headers.referer));
    } catch {}
    return event;
  },
});
