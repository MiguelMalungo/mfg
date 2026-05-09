import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Biography - SP59 | Miguel Ferraz Guedes",
  description: "Learn about Miguel Ferraz Guedes and SP59, our creative workshop in Porto. A sanctuary for artistic exploration and imagination at Rua Serpa Pinto 59.",
  openGraph: {
    title: "Biography - SP59 | Miguel Ferraz Guedes",
    description: "Learn about Miguel Ferraz Guedes and SP59, our creative workshop in Porto. A sanctuary for artistic exploration and imagination at Rua Serpa Pinto 59.",
    url: "https://miguelfguedes.pt/biography",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Biography - SP59 | Miguel Ferraz Guedes",
    description: "Learn about Miguel Ferraz Guedes and SP59, the creative workshop in Porto.",
  },
  alternates: {
    canonical: "https://miguelfguedes.pt/biography",
  },
};

export default function BiographyLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}
