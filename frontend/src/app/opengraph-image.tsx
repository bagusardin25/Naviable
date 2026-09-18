import { ImageResponse } from 'next/og';

export const alt = 'NaviAble — Kenali kondisi akses sebelum berangkat.';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OpenGraphImage() {
  return new ImageResponse(
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '64px 80px', background: '#f2edff', color: '#15213a', fontFamily: 'sans-serif' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 28 }}><span style={{ color: '#6d45cc', fontWeight: 700 }}>NaviAble.</span><span style={{ fontSize: 20 }}>PETA AKSESIBILITAS SURABAYA</span></div>
      <div style={{ display: 'flex', flexDirection: 'column', fontSize: 72, lineHeight: 1.1, fontWeight: 700, letterSpacing: '-3px' }}><span>Kenali kondisi akses</span><span style={{ color: '#6d45cc' }}>sebelum berangkat.</span></div>
      <div style={{ display: 'flex', fontSize: 23 }}>Informasi yang lebih jelas. Dimulai dari Surabaya.</div>
    </div>, size,
  );
}
