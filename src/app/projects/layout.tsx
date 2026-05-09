import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Projects | Miguel Ferraz Guedes",
  description: "Projects by Miguel Ferraz Guedes — NFTs, digital art leveraged by AI, and BLEND by KaleidoKonscious, an interactive book of poems.",
  openGraph: {
    title: "Projects | Miguel Ferraz Guedes",
    description: "Projects by Miguel Ferraz Guedes — NFTs, digital art leveraged by AI, and BLEND by KaleidoKonscious, an interactive book of poems.",
    url: "https://miguelfguedes.pt/projects",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Projects | Miguel Ferraz Guedes",
    description: "NFTs, AI-leveraged digital art, and BLEND by KaleidoKonscious — projects by Miguel Ferraz Guedes.",
  },
  alternates: {
    canonical: "https://miguelfguedes.pt/projects",
  },
};

export default function ProjectsLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}
