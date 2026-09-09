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
  "capoeira",
  "films",
  "photography",
  "surfing",
].join("|");

// Short vanity URLs for the projects worth sharing out loud, e.g.
// miguelfguedes.pt/serenity. Each one lands on its garden note; the
// slug on the right is the internal one, which does not always match.
const VANITY_NOTES: Record<string, string> = {
  serenity: "blend",
  blocks: "blocks",
};

const nextConfig: NextConfig = {
  async redirects() {
    return [
      { source: "/projects", destination: "/garden", permanent: true },
      {
        source: `/garden/:slug(${GARDEN_SLUGS})`,
        destination: "/garden#:slug",
        permanent: true,
      },
      ...Object.entries(VANITY_NOTES).map(([vanity, slug]) => ({
        source: `/${vanity}`,
        destination: `/garden#${slug}`,
        permanent: false,
      })),
    ];
  },
  async rewrites() {
    return [
      { source: "/garden", destination: "/garden/index.html" },
      { source: "/cv", destination: "/cv/index.html" },
      // MiKS is a whole static site, not a garden note, so it gets its
      // own path. The pages carry <base href="/miks/">, which is what
      // keeps their relative links working from the bare /miks URL.
      { source: "/miks", destination: "/miks/index.html" },
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
