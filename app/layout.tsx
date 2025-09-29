import "./globals.css";
import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { Inter } from "next/font/google";

const inter = Inter({ subsets: ["latin"], display: "swap" });

export const metadata: Metadata = {
  title: "EOV6",
  description: "Ephemeral one-visit secure chat for call centers",
  themeColor: "#1F7AED",
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/icon.png", sizes: "512x512", type: "image/png" }
    ],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.className}>
      <body>
        <header className="border-b bg-white">
          <div className="mx-auto max-w-6xl px-6 h-14 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2">
              <Image src="/icon.svg" alt="EOV6" width={24} height={24} />
              <span className="font-semibold">EOV6</span>
            </Link>
            <nav className="flex items-center gap-5 text-sm text-zinc-700">
              <Link href="/how-it-works" className="hover:text-zinc-900">How it works</Link>
              <Link href="/solutions/call-centers" className="hover:text-zinc-900">Solutions</Link>
              <Link href="/pricing" className="hover:text-zinc-900">Pricing</Link>
              <Link href="/about" className="hover:text-zinc-900">About</Link>
              <Link href="/contact" className="button-ghost">Contact</Link>
            </nav>
          </div>
        </header>

        <main className="min-h-[calc(100vh-56px)]">{children}</main>

        <footer className="border-t mt-16">
          <div className="mx-auto max-w-6xl px-6 py-8 text-sm text-zinc-600 flex flex-col md:flex-row items-start md:items-center gap-4 justify-between">
            <div>© {new Date().getFullYear()} EOV6. All rights reserved.</div>
            <div className="flex gap-4">
              <Link href="/privacy" className="hover:underline">Privacy</Link>
              <Link href="/terms" className="hover:underline">Terms</Link>
              <Link href="/support" className="hover:underline">Support</Link>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
