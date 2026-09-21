import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Providers } from '@/components/Providers';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const metadata: Metadata = {
  title: 'Voltix Home — 8-Channel Cloud & Smart Gate Access',
  description: 'Enterprise self-hosted Sinric Pro alternative and AI smart gate access console with real-time CSV audit logs.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans antialiased bg-zinc-950 text-zinc-100 min-h-screen bg-grid-white/5`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}