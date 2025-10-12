// next.config.mjs
import createMDX from "@next/mdx";
import { withSentryConfig } from "@sentry/nextjs";

const withMDX = createMDX({
  extension: /\.mdx?$/,
});

const nextConfig = {
  pageExtensions: ["ts", "tsx", "md", "mdx"],
  // No custom webpack MDX rules here - the @next/mdx plugin handles it.
};

const configWithMDX = withMDX(nextConfig);

export default withSentryConfig(
  configWithMDX,
  {
    silent: true, // reduce build noise
  },
  {
    // client and server webpack plugins are enabled by default
  }
);
