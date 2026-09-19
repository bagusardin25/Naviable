import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

export const metadata: Metadata = {
  metadataBase: new URL('https://naviable.vercel.app'),
  title: 'NaviAble — Peta Aksesibilitas Kota Surabaya',
  description:
    'Kenali informasi akses tempat di Surabaya, sumber datanya, dan bagian yang masih perlu diperiksa sebelum berangkat.',
  icons: {
    icon: '/logo-only-light-3.png',
    shortcut: '/logo-only-light-3.png',
    apple: '/logo-only-light-3.png',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id" className={`min-h-full antialiased ${inter.variable}`}>
      <body className="min-h-full flex flex-col font-sans">{children}</body>
    </html>
  );
}
