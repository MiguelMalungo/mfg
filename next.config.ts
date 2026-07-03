import type { NextConfig } from "next";

// Old /garden/<slug> pages now live as hash deep-links in the static
// garden experience (public/garden). The list is explicit so that
// /garden/assets, /garden/css and /garden/js still resolve as files.
const GARDEN_SLUGS = [
  "life-on-the-road",
  "blend",
  "blocks",
  "bus",
  "digisol",
  "nfts-ai",
  "sotkis",
  "capoeira",
  "films",
  "photography",
  "surfing",
  "platos-cat",
].join("|");

const nextConfig: NextConfig = {
  async redirects() {
    return [
      { source: "/projects", destination: "/garden", permanent: true },
      {
        source: `/garden/:slug(${GARDEN_SLUGS})`,
        destination: "/garden#:slug",
        permanent: true,
      },
    ];
  },
  async rewrites() {
    return [
      { source: "/garden", destination: "/garden/index.html" },
      { source: "/cv", destination: "/cv/index.html" },
    ];
  },
  async headers() {
    return [
      // belt-and-braces: keep the unlisted CV out of search indexes
      {
        source: "/cv/:path*",
        headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }],
      },
      {
        source: "/cv",
        headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }],
      },
    ];
  },
};

export default nextConfig;
