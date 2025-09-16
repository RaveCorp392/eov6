"use client";

export type OrgTabKey = "general" | "staff" | "features" | "billing" | "usage";

export default function OrgTabs({ current, onChange }:{ current: OrgTabKey; onChange: (k: OrgTabKey)=>void; }){
  const tabs: { key: OrgTabKey; label: string }[] = [
    { key: "general", label: "General" },
    { key: "staff", label: "Staff" },
    { key: "features", label: "Features" },
    { key: "billing", label: "Billing" },
    { key: "usage", label: "Usage" },
  ];
  return (
    <div className="border-b border-slate-200 dark:border-slate-800 px-4">
      <nav className="flex gap-4" aria-label="Org tabs">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={()=>onChange(t.key)}
            className={`py-2 text-sm border-b-2 -mb-[1px] transition-colors ${current===t.key?"border-blue-600 text-blue-600":"border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-slate-100"}`}
          >{t.label}</button>
        ))}
      </nav>
    </div>
  );
}

