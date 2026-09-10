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

// Short vanity URLs that go straight to the project itself, e.g.
// miguelfguedes.pt/serenity.
//
// Every one points at the project's own live host rather than a copy
// kept here. A copy is a copy: /miks used to be vendored into this repo
// and silently went stale the moment the real site moved on. Redirecting
// means each project has exactly one source of truth and updates the
// instant it is deployed, at the cost of the address bar changing.
const VANITY_PROJECTS: Record<string, string> = {
  serenity: "https://miguelmalungo.github.io/kept/",
  blocks: "https://lovely-pegasus-e9f6e6.netlify.app/",
  miks: "https://miguelmalungo.github.io/miks/",
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
      ...Object.entries(VANITY_PROJECTS).map(([vanity, url]) => ({
        source: `/${vanity}`,
        destination: url,
        permanent: false,
      })),
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
