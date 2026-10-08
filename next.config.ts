import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Server Actions cap request bodies at 1MB by default - too small for a
    // proposal attachment. Match the Storage bucket's own 25MB/file limit
    // (see lib/attachments.ts).
    serverActions: {
      bodySizeLimit: "25mb",
    },
  },
};

export default nextConfig;
