import * as Sentry from "@sentry/nextjs";
import { beforeSendMask } from "@/lib/sentry-mask";

export function register() {
  Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN || "",
    environment:
      process.env.NEXT_PUBLIC_VERCEL_ENV || process.env.NODE_ENV || "development",
    tracesSampleRate: 0.1,
    replaysSessionSampleRate: 0.0,
    replaysOnErrorSampleRate: 0.0,
    initialScope: { tags: { app: "eov6", surface: "web-client" } },
    beforeSend: beforeSendMask,
  });
}
