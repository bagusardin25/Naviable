import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Naviable — Peta Aksesibilitas Kota Surabaya',
  description:
    'Platform peta aksesibilitas Surabaya dengan dual-view peta dan daftar, verifikasi 8 elemen akses, pelaporan AI vision berbasis kunci manusia, dan civic observatory.',
  icons: {
    icon: '/naviable-mark.svg',
    shortcut: '/naviable-mark.svg',
    apple: '/naviable-mark-light.png',
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
    <html lang="id" className="h-full antialiased">
      <body className="min-h-full flex flex-col font-sans">{children}</body>
    </html>
  );
}
