"use client";
import * as React from "react";
import { COMMON_LANGS } from "@/lib/googleTranslate";

export function LanguagePicker({ value, onChange }: { value?: string; onChange: (v: string)=>void }) {
  const [q, setQ] = React.useState("");
  const list = COMMON_LANGS.filter(l => l.label.toLowerCase().includes(q.toLowerCase()) || l.code.includes(q));
  return (
    <div className="p-2 w-64">
      <input
        className="w-full border rounded p-2 mb-2"
        placeholder="Search language…"
        value={q}
        onChange={e => setQ(e.target.value)}
      />
      <div className="max-h-56 overflow-auto">
        {list.map(l => (
          <button
            key={l.code}
            className={`w-full text-left px-2 py-1 rounded hover:bg-gray-100 ${value===l.code ? "bg-gray-100" : ""}`}
            onClick={() => onChange(l.code)}
          >
            {l.label} <span className="text-xs text-gray-500">({l.code})</span>
          </button>
        ))}
      </div>
    </div>
  );
}
