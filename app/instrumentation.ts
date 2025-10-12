import * as Sentry from "@sentry/nextjs";
import { beforeSendMask } from "@/lib/sentry-mask";

export async function register() {
  Sentry.init({
    dsn: process.env.SENTRY_DSN || "",
    environment: process.env.VERCEL_ENV || process.env.NODE_ENV || "development",
    tracesSampleRate: 0.1,
    profilesSampleRate: 0.1,
    initialScope: { tags: { app: "eov6", surface: "server" } },
    beforeSend: beforeSendMask,
  });
}
