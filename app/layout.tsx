import type { Metadata } from "next";
import { Geist, Geist_Mono, Bebas_Neue, Instrument_Serif, Space_Grotesk } from "next/font/google";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });
const bebas = Bebas_Neue({ weight: "400", subsets: ["latin"], variable: "--font-bebas" });
const instrument = Instrument_Serif({ weight: "400", subsets: ["latin"], variable: "--font-instrument" });
const space = Space_Grotesk({ subsets: ["latin"], variable: "--font-space" });

export const metadata: Metadata = {
  title: "INSTANT SCRAPER — Ask for anything. Get the files.",
  description: "Papers as PDFs · 100k+ row datasets · GitHub repos · Images · Any webpage — one box, zero config. High-craft scraper with 3D, motion, and instant export.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} ${bebas.variable} ${instrument.variable} ${space.variable} antialiased`}>{children}</body>
    </html>
  );
}
