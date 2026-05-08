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
