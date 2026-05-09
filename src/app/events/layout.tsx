import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Exhibitions | Miguel Ferraz Guedes",
  description: "Current exhibitions by Miguel Ferraz Guedes in Porto — at Alice in Brewland Café and Patio da Almada on Rua do Almada.",
  openGraph: {
    title: "Exhibitions | Miguel Ferraz Guedes",
    description: "Current exhibitions by Miguel Ferraz Guedes in Porto — at Alice in Brewland Café and Patio da Almada on Rua do Almada.",
    url: "https://miguelfguedes.pt/events",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Exhibitions | Miguel Ferraz Guedes",
    description: "Current exhibitions in Porto — Alice in Brewland Café and Patio da Almada.",
  },
  alternates: {
    canonical: "https://miguelfguedes.pt/events",
  },
};

export default function EventsLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}
