import * as Sentry from "@sentry/nextjs";

export async function register() {
  Sentry.init({
    dsn: process.env.SENTRY_DSN || "",
    environment: process.env.VERCEL_ENV || process.env.NODE_ENV || "development",
    tracesSampleRate: 0.1,
    profilesSampleRate: 0.1,
    initialScope: { tags: { app: "eov6", surface: "server" } },
    beforeSend(event) {
      try {
        const mask = (url?: string) =>
          url ? url.replace(/(\/s\/)(\d{6})(\b|\/)/g, "$1[code]$3") : url;
        if (event.request?.url) event.request.url = mask(event.request.url);
        const h = event.request?.headers as any;
        if (h?.Referer) h.Referer = mask(String(h.Referer));
        if (h?.referer) h.referer = mask(String(h.referer));
      } catch {}
      return event;
    },
  });
}
