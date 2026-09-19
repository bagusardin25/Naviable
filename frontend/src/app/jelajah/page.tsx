import type { Metadata } from 'next';
import { Suspense } from 'react';
import ExploreApp from '@/components/explore/ExploreApp';
import 'leaflet/dist/leaflet.css';

export const metadata: Metadata = {
  title: 'Jelajahi Peta Aksesibilitas Surabaya · NaviAble',
  description: 'Cari tempat, periksa informasi fasilitas, dan kenali sumber data aksesibilitas di Surabaya.',
  alternates: { canonical: '/jelajah' },
};

export default function ExplorePage() {
  return <Suspense fallback={<main style={{ padding: '3rem' }}><h1>Peta Aksesibilitas Surabaya</h1><p role="status">Menyiapkan peta dan daftar tempat…</p></main>}><ExploreApp /></Suspense>;
}
