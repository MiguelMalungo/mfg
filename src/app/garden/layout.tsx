import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Digital Garden | Miguel Ferraz Guedes",
  description:
    "A place for things I am tending — projects, films, photography, life on the road, capoeira, surfing. Some mature, some sprouting, some just seeds.",
  openGraph: {
    title: "Digital Garden | Miguel Ferraz Guedes",
    description:
      "A place for things I am tending — projects, films, photography, life on the road, capoeira, surfing.",
    url: "https://miguelfguedes.pt/garden",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Digital Garden | Miguel Ferraz Guedes",
    description:
      "Projects, films, photography, life on the road, capoeira, surfing — tended over time.",
  },
  alternates: {
    canonical: "https://miguelfguedes.pt/garden",
  },
};

export default function GardenLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}
