import Link from "next/link";
import { cookies } from "next/headers";

const TRIAL_DAYS_DEFAULT = 30;
const trialEnabled = (process.env.TRIAL_ENABLE ?? "0") === "1";
const trialDays = Number(process.env.TRIAL_DAYS ?? `${TRIAL_DAYS_DEFAULT}`) || TRIAL_DAYS_DEFAULT;
const TRIAL_COOKIE_MAX_AGE = 60 * 60 * 24 * trialDays;

async function dismissTrialBanner() {
  "use server";

  cookies().set({
    name: "trial_dismissed",
    value: "1",
    maxAge: TRIAL_COOKIE_MAX_AGE,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
}

export default function TrialBanner() {
  if (!trialEnabled) return null;

  const cookieStore = cookies();
  const eligible = cookieStore.get("trial_eligible")?.value === "true";
  const dismissed = cookieStore.get("trial_dismissed")?.value === "1";

  if (!eligible || dismissed) return null;

  return (
    <div className="bg-emerald-50 border border-emerald-200 text-sm text-emerald-900">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="font-medium">
          You&apos;re eligible for a {trialDays}-day free trial - no charge today. Cancel anytime.
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/how-it-works#trial"
            className="rounded border border-emerald-300 px-3 py-1 text-sm font-medium text-emerald-900 transition hover:bg-emerald-100"
          >
            How it works
          </Link>
          <form action={dismissTrialBanner}>
            <button
              type="submit"
              className="rounded px-3 py-1 text-sm text-emerald-700 underline-offset-4 transition hover:underline"
            >
              Dismiss
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
