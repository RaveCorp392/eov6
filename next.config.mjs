// next.config.mjs
import createMDX from '@next/mdx';

const withMDX = createMDX({
  extension: /\.mdx?$/,
});

const nextConfig = {
  pageExtensions: ['ts', 'tsx', 'md', 'mdx'],
  // No custom webpack MDX rules here — the @next/mdx plugin handles it.
};

export default withMDX(nextConfig);
