import React from "react";

/**
 * Convert plain text into a React fragment where any URLs are rendered
 * as <a target="_blank" rel="noopener noreferrer nofollow"> links.
 * - Supports https://, http://, and www.* patterns.
 * - Preserves spacing and punctuation; no dangerouslySetInnerHTML.
 */
export function linkifyText(text: string): React.ReactNode[] {
  if (!text) return [];
  const urlRe = /(https?:\/\/[^\s<>()\[\]]+|www\.[^\s<>()\[\]]+)/gi;

  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = urlRe.exec(text)) !== null) {
    const start = match.index;
    const end = start + match[0].length;

    // preceding text
    if (lastIndex < start) parts.push(text.slice(lastIndex, start));

    const raw = match[0];

    // trim trailing punctuation commonly attached to URLs in prose
    const trailingMatch = raw.match(/[),.;!?]+$/);
    const trailing = trailingMatch ? trailingMatch[0] : "";
    const core = trailing ? raw.slice(0, raw.length - trailing.length) : raw;

    const href = core.startsWith("http") ? core : `https://${core}`;

    parts.push(
      <a
        key={`${start}-${end}-${core}`}
        href={href}
        target="_blank"
        rel="noopener noreferrer nofollow"
        className="text-cyan-600 underline break-words hover:opacity-90"
      >
        {core}
      </a>
    );

    if (trailing) parts.push(trailing);
    lastIndex = end;
  }

  if (lastIndex < text.length) parts.push(text.slice(lastIndex));
  return parts;
}

export function LinkifiedText({ text }: { text: string }) {
  return <>{linkifyText(text)}</>;
}
