// app/thanks/page.tsx
import { stripe } from "@/lib/stripe";
import Link from "next/link";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

type Props = { searchParams: { session_id?: string } };

export default async function ThanksPage({ searchParams }: Props) {
  const sessionId = searchParams.session_id;
  if (!sessionId) {
    redirect("/pricing?missing_session=1");
  }

  let session:
    | Awaited<ReturnType<typeof stripe.checkout.sessions.retrieve>>
    | null = null;

  try {
    session = await stripe.checkout.sessions.retrieve(sessionId!, {
      expand: ["line_items.data.price.product"],
    });
  } catch (e) {
    console.error("Failed to retrieve checkout session", e);
    redirect("/pricing?session_lookup=failed");
  }

  const email =
    (session?.customer_details?.email && String(session.customer_details.email)) ||
    undefined;
  const isSub = Boolean(session?.subscription);
  const amount = ((session?.amount_total ?? 0) / 100).toFixed(2);
  const currency = String(session?.currency ?? "").toUpperCase();

  return (
    <main className="mx-auto max-w-2xl p-8">
      <h1 className="text-2xl font-semibold">You’re all set dYZ%</h1>
      <p className="text-slate-600 mt-2">
        {isSub ? "Your subscription is active." : "Your pass has been activated."}{" "}
        {email ? (<>
          A receipt has been emailed to <span className="font-medium">{email}</span>.
        </>) : null}
      </p>

      <div className="mt-6 rounded-xl border bg-white/60 p-4">
        <div className="text-sm text-slate-500">Payment</div>
        <div className="text-lg font-medium">
          {currency} {amount}
        </div>
        <div className="text-xs text-slate-400 mt-1 break-all">Session: {sessionId}</div>
      </div>

      <div className="mt-8 flex gap-3">
        <Link href="/agent" className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700">
          Open the app
        </Link>
        <Link href="/account" className="px-4 py-2 rounded-lg border hover:bg-white/50">
          Manage billing
        </Link>
        <Link href="/pricing" className="px-4 py-2 rounded-lg border hover:bg-white/50">
          Back to pricing
        </Link>
      </div>
    </main>
  );
}

