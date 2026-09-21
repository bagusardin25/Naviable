import type { Metadata } from 'next';
import { LandingShell } from '@/components/landing/LandingShell';
import { LandingContent } from '@/components/landing/LandingContent';

const title = 'NaviAble — Kenali Kondisi Akses di Surabaya';
const description = 'Jelajahi informasi akses tempat di Surabaya, pahami sumber datanya, dan lihat fasilitas yang masih perlu diperiksa sebelum berangkat.';
export const metadata: Metadata = {
  title, description, alternates: { canonical: '/' },
  openGraph: { title, description, url: '/', locale: 'id_ID', type: 'website', siteName: 'NaviAble', images: [{ url: '/opengraph-image', width: 1200, height: 630, alt: 'NaviAble — Kenali kondisi akses sebelum berangkat.' }] },
  twitter: { card: 'summary_large_image', title, description, images: ['/opengraph-image'] },
};

export default function LandingPage() {
  return (
    <LandingShell>
      <LandingContent />
    </LandingShell>
  );
}
