export function maskUrl(url?: string) {
  return url ? url.replace(/(\/s\/)(\d{6})(\b|\/)/g, "$1[code]$3") : url;
}

export function beforeSendMask(event: any) {
  try {
    if (event?.request?.url) event.request.url = maskUrl(event.request.url);
    const h = event?.request?.headers as any;
    if (h?.Referer) h.Referer = maskUrl(String(h.Referer));
    if (h?.referer) h.referer = maskUrl(String(h.referer));
  } catch {}
  return event;
}
