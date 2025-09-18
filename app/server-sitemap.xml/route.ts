// app/server-sitemap.xml/route.ts
import { NextRequest } from 'next/server';

const dynamicUrls = [
  { loc: 'https://eov6.com/blog/why-clarity-matters', lastmod: '2025-09-05' },
  { loc: 'https://eov6.com/blog/call-center-glossary', lastmod: '2025-09-05' },
];

function generateXML(urls: { loc: string; lastmod?: string }[]) {
  const items = urls.map(({ loc, lastmod }) => {
    const lm = lastmod ? `\n    <lastmod>${lastmod}</lastmod>` : '';
    return `  <url>\n    <loc>${loc}</loc>${lm}\n  </url>`;
  }).join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${items}\n</urlset>`;
}

export async function GET(_req: NextRequest) {
  const xml = generateXML(dynamicUrls);
  return new Response(xml, {
    status: 200,
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, s-maxage=600, stale-while-revalidate=3600',
    },
  });
}
