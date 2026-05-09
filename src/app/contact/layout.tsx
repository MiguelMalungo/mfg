import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Contact | Miguel Ferraz Guedes",
  description: "Get in touch with Miguel Ferraz Guedes. Visit our studio at Rua Serpa Pinto 59, Porto, or contact us via email and phone.",
  openGraph: {
    title: "Contact | Miguel Ferraz Guedes",
    description: "Get in touch with Miguel Ferraz Guedes. Visit our studio at Rua Serpa Pinto 59, Porto, or contact us via email and phone.",
    url: "https://miguelfguedes.pt/contact",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Contact | Miguel Ferraz Guedes",
    description: "Get in touch with Miguel Ferraz Guedes — Porto studio at Rua Serpa Pinto 59.",
  },
  alternates: {
    canonical: "https://miguelfguedes.pt/contact",
  },
};

export default function ContactLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}
