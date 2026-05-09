import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Layout from "@/components/Layout/Layout";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Miguel Ferraz Guedes | Porto Based Artist",
  description: "Miguel Ferraz Guedes - Porto Based Artist - Artwork and Collections",
  metadataBase: new URL('https://miguelfguedes.pt'),
  openGraph: {
    title: "Miguel Ferraz Guedes | Porto Based Artist",
    description: "Miguel Ferraz Guedes - Porto Based Artist - Artwork and Collections",
    url: "https://miguelfguedes.pt",
    siteName: "Miguel Ferraz Guedes",
    locale: "pt_PT",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Miguel Ferraz Guedes | Porto Based Artist",
    description: "Miguel Ferraz Guedes - Porto Based Artist - Artwork and Collections",
  },
  robots: {
    index: true,
    follow: true,
  },
};

const personJsonLd = {
  "@context": "https://schema.org",
  "@type": "Person",
  name: "Miguel Ferraz Guedes",
  alternateName: "MFG",
  url: "https://miguelfguedes.pt",
  image: "https://miguelfguedes.pt/images/imageA.webp",
  jobTitle: "Artist",
  description: "Porto-based artist working in mixed technique paintings, NFTs and AI-leveraged digital art.",
  worksFor: {
    "@type": "Organization",
    name: "Miguel Ferraz Guedes",
  },
  address: {
    "@type": "PostalAddress",
    streetAddress: "Rua Serpa Pinto 59",
    addressLocality: "Porto",
    addressCountry: "PT",
  },
  sameAs: [
    "https://www.instagram.com/1gato100futuro/",
    "https://www.tiktok.com/@miguelfguedes",
    "https://linktr.ee/miguelfguedes",
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(personJsonLd) }}
        />
        <Layout>
          {children}
        </Layout>
      </body>
    </html>
  );
}
