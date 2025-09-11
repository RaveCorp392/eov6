// Server-side helper for Cloud Translation (Basic v2 with API key)
const BASE = "https://translation.googleapis.com/language/translate/v2";

export type LangCode = string;

export const COMMON_LANGS: { code: LangCode; label: string }[] = [
  { code: "en", label: "English" },
  { code: "zh-CN", label: "Chinese (Simplified)" },
  { code: "zh-TW", label: "Chinese (Traditional)" },
  { code: "vi", label: "Vietnamese" },
  { code: "ar", label: "Arabic" },
  { code: "hi", label: "Hindi" },
  { code: "pa", label: "Punjabi" },
  { code: "ur", label: "Urdu" },
  { code: "fa", label: "Persian" },
  { code: "el", label: "Greek" },
  { code: "it", label: "Italian" },
  { code: "es", label: "Spanish" },
  { code: "fr", label: "French" },
  { code: "de", label: "German" },
  { code: "fil", label: "Filipino" },
  { code: "ja", label: "Japanese" },
  { code: "ko", label: "Korean" },
  { code: "th", label: "Thai" },
];

function key() {
  const k = process.env.GOOGLE_TRANSLATE_API_KEY;
  if (!k) throw new Error("Missing GOOGLE_TRANSLATE_API_KEY");
  return k;
}

export async function detectLanguage(text: string) {
  const res = await fetch(`${BASE}/detect?key=${key()}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ q: text }),
  });
  const json = await res.json();
  // Best match
  const detection = json?.data?.detections?.[0]?.[0];
  return { language: detection?.language as LangCode | undefined, confidence: detection?.confidence as number | undefined };
}

export async function translateText(opts: {
  text: string;
  target: LangCode;
  source?: LangCode;   // omit to auto-detect
  format?: "html" | "text";
}) {
  const body: any = {
    q: opts.text,
    target: opts.target,
    format: opts.format ?? "text",
  };
  if (opts.source) body.source = opts.source;

  const res = await fetch(`${BASE}?key=${key()}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Translate failed: ${res.status} ${await res.text()}`);
  const json = await res.json();
  const translated = json?.data?.translations?.[0];
  return {
    text: translated?.translatedText as string,
    detectedSourceLanguage: translated?.detectedSourceLanguage as LangCode | undefined,
  };
}
