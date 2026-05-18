import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Life on the Road | Digital Garden | Miguel Ferraz Guedes",
  description:
    "Converting a truck into a home on wheels — and the bus that came before. A long project in two chapters.",
  openGraph: {
    title: "Life on the Road | Miguel Ferraz Guedes",
    description:
      "Converting a truck into a home on wheels — and the bus that came before.",
    url: "https://miguelfguedes.pt/garden/life-on-the-road",
    type: "article",
  },
  alternates: {
    canonical: "https://miguelfguedes.pt/garden/life-on-the-road",
  },
};

export default function LifeOnTheRoadLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}
