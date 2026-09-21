import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "DataHarvest — AI Dataset Workbench",
  description: "Extract clean, structured datasets from any website, document, or research source."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-graphite-950 text-slate-text antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
