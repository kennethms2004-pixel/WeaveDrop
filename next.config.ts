import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Next 16 defaults production `next build` to Turbopack; an empty config opts
  // in explicitly so a custom `webpack` hook remains valid for `next dev --webpack`.
  turbopack: {},
  webpack: (config, { dev }) => {
    // Persistent webpack disk cache under `.next/dev/cache/webpack` can end up
    // half-deleted (ENOENT on `*.pack.gz_`) when multiple `next dev` processes
    // or cloud sync touch the same tree — that surfaces as generic 500s.
    if (dev) {
      config.cache = false;
    }
    return config;
  },
};

export default nextConfig;
