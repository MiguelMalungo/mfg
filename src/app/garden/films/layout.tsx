import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Films | Digital Garden | Miguel Ferraz Guedes",
  description:
    "Films by Miguel Ferraz Guedes, including Plato's Cat — an AI-assisted film in the making — and selected YouTube work.",
  openGraph: {
    title: "Films | Miguel Ferraz Guedes",
    description:
      "Films by Miguel Ferraz Guedes, including Plato's Cat, an AI-assisted film in the making.",
    url: "https://miguelfguedes.pt/garden/films",
    type: "article",
  },
  alternates: {
    canonical: "https://miguelfguedes.pt/garden/films",
  },
};

export default function FilmsLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}
