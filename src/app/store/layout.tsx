import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Store | Miguel Ferraz Guedes",
  description: "Browse and purchase original artworks by Miguel Ferraz Guedes. Collections include CAVE, DEFFECTS, VOID, TRANSMITTERS, BASED, POINTS, DREAM ENGINE, and SINGLE WORKS.",
  openGraph: {
    title: "Store | Miguel Ferraz Guedes",
    description: "Browse and purchase original artworks by Miguel Ferraz Guedes. Collections include CAVE, DEFFECTS, VOID, TRANSMITTERS, BASED, POINTS, DREAM ENGINE, and SINGLE WORKS.",
    url: "https://miguelfguedes.pt/store",
    type: "website",
  },
  alternates: {
    canonical: "https://miguelfguedes.pt/store",
  },
};

export default function StoreLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}
