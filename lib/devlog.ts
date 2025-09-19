export function devlog(label: string, data: any) {
  if (typeof window === "undefined") return;
  try {
    const params = new URLSearchParams(window.location.search);
    const on = params.get("debug") === "1" || process.env.NODE_ENV !== "production";
    if (!on) return;
    // eslint-disable-next-line no-console
    console.log(`[EOV6 ${label}]`, data);
  } catch {}
}

