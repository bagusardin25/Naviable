import type { Metadata, Viewport } from 'next';
import { Poppins } from 'next/font/google';
import '@fontsource/opendyslexic/400.css';
import '@fontsource/opendyslexic/400-italic.css';
import '@fontsource/opendyslexic/700.css';
import '@fontsource/opendyslexic/700-italic.css';
import './globals.css';
import './auth.css';

const poppins = Poppins({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700', '800', '900'],
  display: 'swap',
  variable: '--font-poppins',
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

import { LanguageProvider } from '@/providers/LanguageProvider';
import { AccessibilityProvider } from '@/providers/AccessibilityProvider';
import { AccessibilityWidget } from '@/components/accessibility/AccessibilityWidget';
import { ReadingGuideOverlay } from '@/components/accessibility/ReadingGuideOverlay';
import { VoiceReaderManager } from '@/components/accessibility/VoiceReaderManager';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id" className={`min-h-full antialiased ${poppins.variable}`}>
      <body className={`min-h-full flex flex-col font-sans ${poppins.className}`}>
        <LanguageProvider>
          <AccessibilityProvider>
            {children}
            <ReadingGuideOverlay />
            <VoiceReaderManager />
            <AccessibilityWidget />
          </AccessibilityProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}
