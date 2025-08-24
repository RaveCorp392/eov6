// next.config.mjs
import createMDX from '@next/mdx';

const withMDX = createMDX({
  extension: /\.mdx?$/,
});

const nextConfig = {
  // allow importing .mdx as pages/components
  pageExtensions: ['ts', 'tsx', 'mdx'],
  experimental: { typedRoutes: true },
  reactStrictMode: true,
};

export default withMDX(nextConfig);
