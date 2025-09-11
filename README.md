# EOV6 Site Bundle — 2025-09-07

Drop these into a Next.js App Router project with Tailwind.

## Includes
- components/SEO.tsx
- app/marketing/page.tsx
- app/solutions/{call-centers,government,smb}/page.tsx
- app/pricing/page.tsx
- app/blog/page.tsx
- app/blog/{why-clarity-matters.mdx, call-center-glossary.mdx}
- app/case-studies/{hypothetical-bpo.mdx, hypothetical-government.mdx, hypothetical-smb.mdx}
- public/robots.txt
- public/sitemap.xml (static starter)
- next-sitemap.js (auto sitemap/robots at build)
- app/server-sitemap.xml/route.ts (dynamic sitemap endpoint)

## Setup
1) npm i next-sitemap
2) Add to package.json scripts:
   "postbuild": "next-sitemap"
3) Deploy; Vercel will serve /robots.txt and /sitemap.xml from /public.
4) /server-sitemap.xml is generated at runtime; edit the URL list or fetch from your data source.
