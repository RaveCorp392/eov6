// next.config.mjs
import createMDX from "@next/mdx";

/** @type {import('next').NextConfig} */
const withMDX = createMDX({
  extension: /\.mdx?$/,
  options: {
    // add remark/rehype plugins here later if you want
    remarkPlugins: [],
    rehypePlugins: [],
  },
});

export default withMDX({
  pageExtensions: ["ts", "tsx", "js", "jsx", "md", "mdx"],
  experimental: { typedRoutes: true },
});
