import React from "react";

/**
 * Render text with URLs as <a target="_blank" ...> links.
 * - No innerHTML
 * - Supports http(s) and www.*
 * - Variant-aware classes for contrast on dark/light bubbles
 */
export type LinkVariant = "on-dark" | "on-light";

export function linkifyText(text: string, variant: LinkVariant = "on-light"): React.ReactNode[] {
  if (!text) return [];
  const urlRe =
    /(https?:\/\/[^\s<>()\[\]]+|www\.[^\s<>()\[\]]+|\b(?:[a-z0-9-]+\.)+[a-z]{2,}(?:\/[^\s<>()\[\]]*)?)/gi;

  const aClass =
    variant === "on-dark"
      ? "text-white underline underline-offset-2 decoration-white/90 hover:decoration-white focus-visible:ring-2 focus-visible:ring-white/70"
      : "text-cyan-700 underline underline-offset-2 decoration-cyan-700/80 hover:decoration-cyan-700 focus-visible:ring-2 focus-visible:ring-cyan-600/30";

  const out: React.ReactNode[] = [];
  let last = 0;
  let m: RegExpExecArray | null;

  while ((m = urlRe.exec(text)) !== null) {
    const start = m.index;
    const end = start + m[0].length;

    if (last < start) out.push(text.slice(last, start));

    const raw = m[0];
    const trailingMatch = raw.match(/[),.;!?]+$/);
    const trailing = trailingMatch ? trailingMatch[0] : "";
    const core = trailing ? raw.slice(0, raw.length - trailing.length) : raw;

    const href = core.startsWith("http") ? core : `https://${core}`;

    out.push(
      <a
        key={`${start}-${end}-${core}`}
        href={href}
        target="_blank"
        rel="noopener noreferrer nofollow"
        className={`${aClass} break-words`}
      >
        {core}
      </a>
    );
    if (trailing) out.push(trailing);

    last = end;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

export function LinkifiedText({ text, variant = "on-light" }: { text: string; variant?: LinkVariant }) {
  return <>{linkifyText(text, variant)}</>;
}
