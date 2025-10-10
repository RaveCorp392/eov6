import Link from "next/link";
import { redirect } from "next/navigation";
import JobsCard from "@/components/admin/JobsCard";
import { requireOwner } from "@/lib/authz";

const quickLinks = [
  { href: "/admin/organizations", label: "Manage organizations" },
  { href: "/admin/entitlements", label: "Entitlements" },
  { href: "/admin/usage", label: "Usage" },
];

export default async function AdminHome() {
  const { ok } = await requireOwner();
  if (!ok) redirect("/");

  return (
    <main className="min-h-[100svh] bg-slate-50">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-8 space-y-6">
        <JobsCard />

        <section className="rounded-2xl border border-slate-200 bg-white p-6">
          <h2 className="text-base font-semibold text-slate-900">Admin panels</h2>
          <p className="mt-2 text-sm text-slate-600">
            Jump into the detailed admin views to manage organizations, entitlements, and usage.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            {quickLinks.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className="inline-flex items-center rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
              >
                {label}
              </Link>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
