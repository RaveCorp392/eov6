export default function PricingFAQ() {
  const faqs = [
    { q: "Can I add seats later?", a: "Yes. Team adds in 5-seat blocks; Enterprise supports 6\u2013100 seats self-serve." },
    { q: "How does Translate pricing work?", a: "Solo +$1/seat. Team +$5 per bundle. Enterprise +$0.50 per seat (or PAYG)." },
    { q: "Is there a trial?", a: "Use the One-Week Pass for A$5\u2014no subscription." },
    { q: "Can I cancel anytime?", a: "Yes. You can manage billing and changes via the portal." },
  ];
  return (
    <div className="mt-12">
      <h2 className="text-2xl font-semibold mb-4">Frequently asked questions</h2>
      <div className="grid md:grid-cols-2 gap-6">
        {faqs.map((f) => (
          <div key={f.q} className="rounded-2xl border p-5">
            <div className="font-medium mb-2">{f.q}</div>
            <div className="text-zinc-700">{f.a}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
