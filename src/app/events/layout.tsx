import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Events | Miguel Ferraz Guedes",
  description: "Upcoming events at Miguel Ferraz Guedes studio. Join us for open house events, exhibitions, and artist talks at Rua Serpa Pinto 59, Porto.",
  openGraph: {
    title: "Events | Miguel Ferraz Guedes",
    description: "Upcoming events at Miguel Ferraz Guedes studio. Join us for open house events, exhibitions, and artist talks at Rua Serpa Pinto 59, Porto.",
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
