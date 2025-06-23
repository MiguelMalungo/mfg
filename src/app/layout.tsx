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
  description: "Miguel Ferraz Guedes - Contemporary artist based in Porto, Portugal. Explore original artwork collections including CAVE, DREAM ENGINE, DEFFECTS, VOID, TRANSMITTERS, BASED, and POINTS.",
  keywords: ["Miguel Ferraz Guedes", "Porto artist", "contemporary art", "original artwork", "art collections", "CAVE collection", "DREAM ENGINE", "DEFFECTS", "VOID", "TRANSMITTERS", "BASED", "POINTS", "Portuguese artist"],
  creator: "Miguel Ferraz Guedes",
  publisher: "Miguel Ferraz Guedes Studio",
  openGraph: {
    title: "Miguel Ferraz Guedes | Porto Based Artist",
    description: "Contemporary artist based in Porto, Portugal. Explore original artwork collections.",
    url: "https://miguelferrazguedes.com",
    siteName: "Miguel Ferraz Guedes",
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Miguel Ferraz Guedes | Porto Based Artist",
    description: "Contemporary artist based in Porto, Portugal. Explore original artwork collections.",
    creator: "@miguelferrazguedes",
  },
  robots: {
    index: true,
    follow: true,
  },
  alternates: {
    canonical: "https://miguelferrazguedes.com",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <Layout>
          {children}
        </Layout>
      </body>
    </html>
  );
}
