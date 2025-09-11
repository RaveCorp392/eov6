"use client";
import Head from "next/head";
type Props = { title: string; description: string; url?: string; image?: string; type?: "website" | "article"; schema?: object; };
export default function SEO({ title, description, url = "https://eov6.com", image = "https://eov6.com/og.jpg", type = "website", schema, }: Props) {
  const fullTitle = `${title} · EOV6`;
  return (
    <Head>
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <meta name="robots" content="index,follow" />
      <link rel="canonical" href={url} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:type" content={type} />
      <meta property="og:url" content={url} />
      <meta property="og:image" content={image} />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={image} />
      {schema && (<script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />)}
    </Head>
  );
}
