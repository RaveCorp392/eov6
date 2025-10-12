// sentry.server.config.ts
// Server-side Sentry for EOV6 - captures API/route errors plus traces.
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.SENTRY_DSN || "",
  environment:
    (process.env.VERCEL_ENV as string) ||
    (process.env.NODE_ENV as string) ||
    "development",
  tracesSampleRate: 0.1, // 10% sampled server traces
  profilesSampleRate: 0.1, // Node profiling sample
  initialScope: {
    tags: { app: "eov6", surface: "server" },
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
