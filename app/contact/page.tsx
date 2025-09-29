import Link from "next/link";

export const metadata = { title: "Contact - EOV6" };

export default function ContactPage() {
  return (
    <div className="py-8">
      <div className="mx-auto max-w-3xl px-6">
        <h1 className="text-3xl font-bold mb-3">Contact</h1>
        <p className="lead mb-6">
          Prefer email? <a href="mailto:hello@eov6.com">hello@eov6.com</a>
        </p>

        <div className="card p-6">
          <form action="/api/contact" method="post" className="space-y-4">
            <div>
              <label className="block text-sm font-medium">Name</label>
              <input name="name" required className="mt-1 w-full rounded border border-zinc-200 px-3 py-2" />
            </div>
            <div>
              <label className="block text-sm font-medium">Email</label>
              <input type="email" name="email" required className="mt-1 w-full rounded border border-zinc-200 px-3 py-2" />
            </div>
            <div>
              <label className="block text-sm font-medium">Company (optional)</label>
              <input name="company" className="mt-1 w-full rounded border border-zinc-200 px-3 py-2" />
            </div>
            <div>
              <label className="block text-sm font-medium">Message</label>
              <textarea name="message" rows={5} required className="mt-1 w-full rounded border border-zinc-200 px-3 py-2" />
            </div>

            <button className="button-primary">Send</button>
          </form>
        </div>
        <p className="text-xs text-zinc-500 mt-3">
          We will reply by email. You will also get an acknowledgement from our mailing system.
        </p>

        <p className="mt-8 text-sm">
          <Link className="hover:underline text-zinc-700" href="/pricing">
            Back to pricing
          </Link>
        </p>
      </div>
    </div>
  );
}
