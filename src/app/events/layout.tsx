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
