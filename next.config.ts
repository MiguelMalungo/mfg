import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      { source: "/projects", destination: "/garden", permanent: true },
    ];
  },
};

export default nextConfig;
