import "./globals.css";
import type { Metadata } from "next";
import { Inter, Open_Sans } from "next/font/google";
import React from "react";
import Footer from "@/components/Footer";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const openSans = Open_Sans({ subsets: ["latin"], variable: "--font-open-sans", display: "swap" });

export const metadata: Metadata = {
  title: "EOV6",
  description: "Clarity at every call",
  icons: [{ rel: "icon", url: "/favicon.ico" }],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${openSans.variable}`}>
      <body className="min-h-screen bg-white text-slate-900 antialiased flex flex-col">
        <main className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
