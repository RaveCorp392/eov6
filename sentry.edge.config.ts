// sentry.edge.config.ts
// Edge runtime coverage (only used if middleware or edge routes exist).
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN || "",
  environment:
    (process.env.VERCEL_ENV as string) ||
    (process.env.NODE_ENV as string) ||
    "development",
  tracesSampleRate: 0.1,
  initialScope: {
    tags: { app: "eov6", surface: "edge" },
  },
  beforeSend(event) {
    try {
      const mask = (url?: string) =>
        url ? url.replace(/(\/s\/)(\d{6})(\b|\/)/g, "$1[code]$3") : url;
      if (event.request?.url) event.request.url = mask(event.request.url);
    } catch {}
    return event;
  },
});
