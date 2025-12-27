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
        <Layout>
          {children}
        </Layout>
      </body>
    </html>
  );
}
