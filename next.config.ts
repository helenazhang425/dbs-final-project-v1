import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ['192.168.0.155'],
  turbopack: {
    root: process.cwd(),
  },
};

export default nextConfig;
