"use client";
import { useMemo, useState } from "react";
import { computeRoi, type RoiInput } from "@/lib/roi";

export type RoiLeadCalcProps = {
  defaultValues?: Partial<RoiInput>;
  onSubmitted?: () => void;
};

export default function RoiLeadCalc({ defaultValues, onSubmitted }: RoiLeadCalcProps){
  const [agents, setAgents] = useState(defaultValues?.agents ?? 250);
  const [callsPerAgentPerDay, setCallsPerAgentPerDay] = useState(defaultValues?.callsPerAgentPerDay ?? 50);
  const [minutesSavedPerCall, setMinutesSavedPerCall] = useState(defaultValues?.minutesSavedPerCall ?? 2);
  const [costPerHour, setCostPerHour] = useState(defaultValues?.costPerHour ?? 30);
  const [workDaysPerYear, setWorkDaysPerYear] = useState(defaultValues?.workDaysPerYear ?? 240);

  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [consent, setConsent] = useState(true);
  const [hp, setHp] = useState("");

  const result = useMemo(
    () => computeRoi({ agents, callsPerAgentPerDay, minutesSavedPerCall, costPerHour, workDaysPerYear }),
    [agents, callsPerAgentPerDay, minutesSavedPerCall, costPerHour, workDaysPerYear]
  );

  async function submit(){
    try{
      setBusy(true);
      setError(null);
      const payload = {
        email: email.trim(),
        company: company.trim(),
        consent,
        hp,
        inputs: { agents, callsPerAgentPerDay, minutesSavedPerCall, costPerHour, workDaysPerYear },
        outputs: result,
        page: typeof window !== "undefined" ? window.location.pathname : "/pricing",
      };
      const res = await fetch("/api/roi/lead", {
        method: "POST",
        headers: {"content-type":"application/json"},
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to submit");
      setDone(true);
      onSubmitted?.();
    }catch(e:any){
      setError(e?.message ?? String(e));
    }finally{
      setBusy(false);
    }
  }

  return (
    <section aria-label="ROI calculator" className="rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
      <div className="grid md:grid-cols-2">
        {/* Controls */}
        <div className="p-5 bg-white dark:bg-slate-950">
          <h2 className="text-lg font-semibold">Estimate your annual savings</h2>
          <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">Adjust the inputs. Instant results on the right. No email required.</p>
          <div className="mt-4 grid gap-3">
            <NumberField label="# of agents" value={agents} onChange={setAgents} min={10} max={50000} step={10} />
            <NumberField label="Calls per agent per day" value={callsPerAgentPerDay} onChange={setCallsPerAgentPerDay} min={10} max={150} step={5} />
            <NumberField label="Minutes saved per call" value={minutesSavedPerCall} onChange={setMinutesSavedPerCall} min={0} max={10} step={0.5} />
            <NumberField label="Fully-loaded cost/hour (USD)" value={costPerHour} onChange={setCostPerHour} min={10} max={120} step={1} />
            <NumberField label="Working days per year" value={workDaysPerYear} onChange={setWorkDaysPerYear} min={180} max={260} step={1} />
          </div>
        </div>

        {/* Output + soft gate */}
        <div className="p-5 bg-slate-50 dark:bg-slate-900/50 border-t md:border-t-0 md:border-l border-slate-200 dark:border-slate-800">
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-4 bg-white/70 dark:bg-slate-950/40">
            <div className="text-sm text-slate-600 dark:text-slate-300">Estimated annual savings</div>
            <div className="mt-1 text-4xl font-bold">{formatCurrency(result.annualSavings)}</div>
            <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
              <KV k="Minutes saved/day" v={result.minutesSavedPerDay.toLocaleString()} />
              <KV k="Hours saved/day" v={result.hoursSavedPerDay.toLocaleString()} />
              <KV k="Daily value" v={formatCurrency(result.dailyValue)} />
              <KV k="Assumptions" v={`${minutesSavedPerCall}m • ${agents} agents`} />
            </div>
          </div>

          <div className="mt-5">
            <div className="text-sm font-medium">Email me a copy (optional)</div>
            <p className="text-xs text-slate-500 mt-1">We’ll send this calculation and a short overview. You’ll still see results even if you skip.</p>
            <div className="mt-2 grid md:grid-cols-2 gap-2">
              <input type="email" inputMode="email" placeholder="you@company.com" value={email} onChange={e=>setEmail(e.target.value)} className="border rounded px-3 py-2 bg-white dark:bg-slate-950" aria-label="Email address"/>
              <input type="text" placeholder="Company (optional)" value={company} onChange={e=>setCompany(e.target.value)} className="border rounded px-3 py-2 bg-white dark:bg-slate-950" aria-label="Company"/>
              <input type="text" value={hp} onChange={e=>setHp(e.target.value)} className="hidden" tabIndex={-1} aria-hidden="true" />
            </div>
            <label className="flex items-center gap-2 mt-2 text-xs">
              <input type="checkbox" checked={consent} onChange={e=>setConsent(e.target.checked)} />
              <span>I agree to be contacted about EOV6. You can unsubscribe anytime.</span>
            </label>
            <div className="mt-3 flex gap-2">
              <button onClick={submit} disabled={busy || !email} className="px-4 py-2 rounded-xl bg-blue-600 text-white disabled:opacity-50">{busy?"Sending…":"Send me this ROI"}</button>
              <a href="#pricing" className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700">See plans</a>
            </div>
            {error && <p className="text-xs text-red-600 mt-2">{error}</p>}
            {done && <p className="text-xs text-green-700 mt-2">Sent! Check your inbox for a copy.</p>}
          </div>
        </div>
      </div>
    </section>
  );
}

function NumberField({ label, value, onChange, min, max, step }:{
  label:string; value:number; onChange:(n:number)=>void; min:number; max:number; step:number;
}){
  return (
    <label className="grid gap-1">
      <span className="text-sm font-medium">{label}</span>
      <input type="number" min={min} max={max} step={step} value={value} onChange={e=>onChange(Number(e.target.value))} className="border rounded px-3 py-2 bg-white dark:bg-slate-950"/>
    </label>
  );
}
function KV({ k, v }:{ k:string; v:string; }){
  return (
    <div className="rounded-lg border border-slate-200 dark:border-slate-800 p-3">
      <div className="text-xs text-slate-500">{k}</div>
      <div className="text-base font-semibold">{v}</div>
    </div>
  );
}
function formatCurrency(n:number){
  return new Intl.NumberFormat(undefined, { style:"currency", currency:"USD", maximumFractionDigits:0 }).format(n);
}
