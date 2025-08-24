// next.config.mjs
import createMDX from '@next/mdx';

/** @type {import('next').NextConfig} */
const baseConfig = {
  // keep anything else you already use (e.g., experimental.typedRoutes)
  experimental: {
    typedRoutes: true,
  },
};

// Enable MDX in the app router and regular imports (e.g. content/marketing/*.mdx)
const withMDX = createMDX({
  extension: /\.mdx?$/,
  options: {
    // This lets you use <MDXProvider /> goodies and custom components
    providerImportSource: '@mdx-js/react',
  },
});

// Export the wrapped config
export default withMDX({
  ...baseConfig,
  // not required when importing MDX *into* TS/TSX files,
  // but harmless if you want MDX pages too:
  pageExtensions: ['ts', 'tsx', 'mdx'],
});
