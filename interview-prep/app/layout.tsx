import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Navbar } from "@/components/navbar";
import { getOrCreateUser, getCurrentTeam } from "@/lib/session";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "PrepDeck — Mock Interview Platform",
  description: "MCQ tests, company questions, and AI-predicted interview prep",
};

export default async function RootLayout({
  children,
}: LayoutProps<"/">) {
  const [user, team] = await Promise.all([getOrCreateUser(), getCurrentTeam()]);

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <Navbar user={user} team={team} />
        <main className="flex-1 w-full max-w-6xl mx-auto px-4 sm:px-6 py-8">
          {children}
        </main>
        <footer className="border-t border-[var(--border)] py-6 mt-12">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 text-center text-xs text-[var(--muted-foreground)]">
            PrepDeck — MCQ tests, company-tagged questions, and prediction-based prep
            for your team's next round.
          </div>
        </footer>
      </body>
    </html>
  );
}
