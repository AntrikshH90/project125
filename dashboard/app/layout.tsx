import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SandForge — autonomous PR agent",
  description:
    "plan → patch → test → branch/backtrack → PR. NVIDIA Nemotron on Nebius Token Factory Sandboxes.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
