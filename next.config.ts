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
// miguelfguedes.pt/serenity. These live on their own hosts, so the
// address bar changes once the redirect lands — the trade for not
// having to vendor each project into this repo the way /miks is.
// Keep in step with the note hrefs in public/garden/js/data.js.
const VANITY_PROJECTS: Record<string, string> = {
  serenity: "https://miguelmalungo.github.io/kept/",
  blocks: "https://6945a2ad1ceae80c24d7e1cf--lovely-pegasus-e9f6e6.netlify.app/",
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
