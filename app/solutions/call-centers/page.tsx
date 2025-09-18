import Link from "next/link";
import dynamic from "next/dynamic";

const RoiCalc = dynamic(() => import("@/components/roi/RoiLeadCalc"), { ssr: false });

function Card({ title, children }:{ title: string; children: any }){
  return (
    <div className="rounded-2xl border p-4 bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800">
      <h4 className="font-medium">{title}</h4>
      <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{children}</p>
    </div>
  );
}


export default function CallCentersSolutionPage() {
return (
<main className="min-h-screen bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100">
{/* Hero */}
<section className="max-w-6xl mx-auto px-4 pt-16 pb-10">
<div className="grid md:grid-cols-2 gap-8 items-center">
<div>
<span className="inline-block text-xs tracking-wide uppercase text-blue-600">Solutions</span>
<h1 className="text-3xl md:text-5xl font-semibold mt-2 leading-tight">
Clarity at every call — for high‑volume call centers
</h1>
<p className="mt-4 text-slate-600 dark:text-slate-300 text-lg">
EOV6 creates a shared, ephemeral chat during a live call so agents capture
names, emails, numbers and references correctly — first time. Fewer repeats, lower AHT,
higher FCR, happier teams.
</p>
<div className="mt-6 flex flex-wrap gap-3">
  <Link href="/pricing#roi" className="px-5 py-3 rounded-2xl bg-blue-600 text-white shadow">
    See ROI & Pricing
  </Link>
  <Link href="/pricing" className="px-5 py-3 rounded-2xl border border-slate-300 dark:border-slate-700">
    See plans
  </Link>
</div>
<p className="mt-3 text-xs text-slate-500">
Ephemeral by design — data clears on end/timeout. WCAG‑aware. Admin controls for org policy.
</p>
</div>
<div className="relative">
<div className="aspect-[16/10] w-full rounded-2xl bg-gradient-to-br from-blue-600/10 to-cyan-500/10 ring-1 ring-slate-200 dark:ring-slate-800 flex items-center justify-center">
<div className="text-center p-6">
<div className="text-sm text-slate-500">Live call ➜ Shared code ➜ Typed confirmation</div>
<div className="mt-2 font-mono text-2xl">Code: 482931</div>
<div className="mt-3 text-sm text-slate-500">Agent & caller see the same text — no repeats.</div>
</div>
</div>
</div>
</div>
</section>


{/* Value props */}
<section className="max-w-6xl mx-auto px-4 py-12">
<div className="grid md:grid-cols-3 gap-6">
<Card title="Cut AHT without scripts">
Agents skip the painful spelling loop. Most identity fields are captured in <b>under 90 seconds</b>.
</Card>
<Card title="Boost FCR & QA scores">
Accurate details on the first call reduce rework, recontact and transfers. Clear transcripts support QA.
</Card>
<Card title="Reduce burnout & turnover">
Fewer frustrating calls = happier agents. Lower cognitive load means better service at scale.
</Card>
</div>
</section>


{/* ROI calculator */}
<section className="bg-slate-50 dark:bg-slate-900/50 border-y border-slate-100 dark:border-slate-800">
<div className="max-w-6xl mx-auto px-4 py-12">
<div className="md:flex items-end justify-between gap-8">
<div className="max-w-xl">
<h2 className="text-2xl font-semibold">Estimate your ROI</h2>
<p className="mt-2 text-slate-600 dark:text-slate-300">
Small improvements at volume add up fast. Adjust the sliders to see yearly savings.
</p>
</div>
<div className="mt-4 md:mt-0">
<Link href="#contact" className="text-sm underline underline-offset-4">Want a tailored model?</Link>
</div>
</div>
<div className="mt-6">
<RoiCalc />
</div>
</div>
</section>


{/* Enterprise features */}
<section className="max-w-6xl mx-auto px-4 py-12">
<h3 className="text-xl font-semibold">Built for large teams</h3>
<ul className="mt-4 grid md:grid-cols-2 gap-4 text-sm list-disc list-inside">
<li>Admin org controls: uploads toggle, translate‑unlimited, privacy & acknowledgement text</li>
<li>Ephemeral by default: session TTL + purge of files; optional export then clear</li>
<li>SAML/OIDC SSO (roadmap), audit trails (roadmap), regional hosting (roadmap)</li>
<li>Stripe Billing Portal for invoices & payment methods</li>
</ul>
</section>
</main>
)
}
