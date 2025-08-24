// app/marketing/head.tsx
export default function Head() {
  const title = 'EOV6 — Secure details, shared fast';
  const desc =
    "Agents share a code, callers send verified contact details. Ephemeral by default with auto-expire (TTL).";
  const url = 'https://eov6.com/marketing';

  return (
    <>
      <title>{title}</title>
      <meta name="description" content={desc} />
      <meta property="og:type" content="website" />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={desc} />
      <meta property="og:url" content={url} />
      <meta name="twitter:card" content="summary_large_image" />
    </>
  );
}
