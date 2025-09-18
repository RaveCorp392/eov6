// app/contact/page.tsx
import Link from "next/link";

export const metadata = { title: "Contact • EOV6" };

export default function ContactPage() {
  return (
    <main className="mx-auto max-w-2xl p-6">
      <h1 className="text-3xl font-semibold mb-2">Contact</h1>
      <p className="text-gray-600 mb-6">
        Prefer email? <a className="underline" href="mailto:hello@eov6.com">hello@eov6.com</a>
      </p>

      <form action="/api/contact" method="post" className="space-y-4">
        <div>
          <label className="block text-sm font-medium">Name</label>
          <input name="name" required className="mt-1 w-full rounded border px-3 py-2" />
        </div>
        <div>
          <label className="block text-sm font-medium">Email</label>
          <input type="email" name="email" required className="mt-1 w-full rounded border px-3 py-2" />
        </div>
        <div>
          <label className="block text-sm font-medium">Company (optional)</label>
          <input name="company" className="mt-1 w-full rounded border px-3 py-2" />
        </div>
        <div>
          <label className="block text-sm font-medium">Message</label>
          <textarea name="message" rows={5} required className="mt-1 w-full rounded border px-3 py-2" />
        </div>

        <button className="rounded bg-black px-4 py-2 text-white">Send</button>
      </form>

      <p className="mt-6 text-sm text-gray-500">
        We’ll reply by email. You’ll also get an acknowledgement from our mailing system.
      </p>

      <p className="mt-8 text-sm">
        <Link className="underline" href="/pricing">Back to pricing</Link>
      </p>
    </main>
  );
}
