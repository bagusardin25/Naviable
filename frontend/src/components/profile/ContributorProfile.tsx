'use client';
import { useEffect, useState } from 'react';
import { fetchContributions, type ApiReport } from '@/lib/api';
import { supabaseBrowser } from '@/lib/supabase';

export function ContributorProfile() {
  const [data, setData] = useState<{ mode: string; total: number; reports: ApiReport[] } | null>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    fetchContributions().then(value => { if (active) setData(value); }).catch(e => { if (active) setError(e.message); });
    return () => { active = false; };
  }, []);
  async function signOut() {
    if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      await supabaseBrowser().auth.signOut();
    }
    if (typeof window !== 'undefined') {
      localStorage.removeItem('naviable_demo_token');
      localStorage.removeItem('naviable_demo_user');
      window.dispatchEvent(new Event('naviable_auth_change'));
    }
    setData(null);
    setError('Anda telah keluar.');
  }
  return (
    <div className="page-scroll profile-page">
      <section className="profile-hero">
        <div className="avatar large" aria-hidden="true">N</div>
        <div>
          <span className="eyebrow">Relawan Surabaya</span>
          <h1>Kontribusi Saya</h1>
          <p>Daftar laporan kondisi akses yang pernah Anda kirimkan untuk membantu sesama warga.</p>
        </div>
      </section>

      {error && (
        <p role="alert" style={{ color: 'var(--notice-error-ink)', background: 'var(--notice-error-bg)', padding: '12px 16px', borderRadius: '12px', fontSize: '13px', marginTop: '16px', border: '1px solid var(--notice-error-border)' }}>
          {error} <a href="/login" style={{ color: 'var(--purple)', fontWeight: 700, marginLeft: '6px', textDecoration: 'underline' }}>Masuk ke Akun</a>
        </p>
      )}

      {!data && !error && <p role="status" style={{ padding: '24px 0', color: 'var(--muted)' }}>Memuat riwayat kontribusi…</p>}

      {data && (
        <div className="profile-grid">
          <article className="card" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <h2>Laporan Terkirim</h2>
            <strong className="big-number">{data.total}</strong>
            <p style={{ color: 'var(--muted)', fontSize: '12px', margin: '4px 0 16px' }}>
              Laporan kondisi akses yang Anda bantu perbarui untuk fasilitas publik di Surabaya.
            </p>
            {(
              <button type="button" className="secondary-action" onClick={signOut} style={{ alignSelf: 'flex-start' }}>
                Keluar Akun
              </button>
            )}
          </article>

          <article className="card">
            <div className="card-title-row" style={{ marginBottom: '12px' }}>
              <h2>Laporan Terbaru</h2>
              <span className="count-pill">{data.reports.length} laporan</span>
            </div>
            {data.reports.length ? (
              <div style={{ display: 'grid', gap: '8px', maxHeight: '400px', overflowY: 'auto' }}>
                {data.reports.map((r) => (
                  <div
                    key={r.id}
                    style={{
                      padding: '10px 12px',
                      background: 'var(--surface-secondary)',
                      borderRadius: '10px',
                      border: '1px solid var(--border)',
                      fontSize: '12px',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', fontWeight: 700 }}>
                      <span>{r.reporterName}</span>
                      <span style={{ fontSize: '10px', color: 'var(--muted)' }}>
                        {new Date(r.createdAt).toLocaleDateString('id-ID')}
                      </span>
                    </div>
                    <div style={{ color: '#64748b', fontSize: '11px', marginTop: '3px' }}>
                      Kondisi: {r.elements.map((e) => e.status).join(', ')}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ color: '#64748b', fontSize: '13px' }}>
                Belum ada laporan yang tercatat. Anda bisa mulai berkontribusi dengan memotret dan melaporkan kondisi fasilitas di sekitar Anda.
              </p>
            )}
          </article>
        </div>
      )}
    </div>
  );
}
