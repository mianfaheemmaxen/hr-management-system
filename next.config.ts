import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Tell Next.js not to bundle these server-only packages — they use native
  // Node.js APIs and must be required at runtime, not bundled by webpack.
  serverExternalPackages: ["node-cron"],
};

export default nextConfig;
