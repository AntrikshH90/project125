import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SandForge — Nebius Token Factory coding agent",
  description:
    "Autonomous PR agent: plan → patch → test → branch/backtrack, powered by NVIDIA Nemotron on Nebius Token Factory Sandboxes.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
