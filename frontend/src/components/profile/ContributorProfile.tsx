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
    await supabaseBrowser().auth.signOut();
    setData(null); setError('Anda telah keluar.');
  }
  return (
    <div className="page-scroll profile-page">
      <section className="profile-hero">
        <div className="avatar large" aria-hidden="true">AR</div>
        <div>
          <span className="eyebrow">Kontributor Komunitas</span>
          <h1>{data?.mode === 'local' ? 'Kontribusi Perangkat Lokal' : 'Profil Kontributor'}</h1>
          <p>Riwayat pelaporan dan kontribusi validasi aksesibilitas kota Surabaya.</p>
        </div>
      </section>

      {error && (
        <p role="alert" style={{ color: '#dc2626', background: '#fef2f2', padding: '12px 16px', borderRadius: '12px', fontSize: '13px', marginTop: '16px', border: '1px solid #fecaca' }}>
          {error} <a href="/login" style={{ color: '#6d45cc', fontWeight: 700, marginLeft: '6px', textDecoration: 'underline' }}>Masuk Akun</a>
        </p>
      )}

      {!data && !error && <p role="status" style={{ padding: '24px 0', color: '#64748b' }}>Memuat kontribusi…</p>}

      {data && (
        <div className="profile-grid">
          <article className="card" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <h2>Laporan Tersimpan</h2>
            <strong className="big-number">{data.total}</strong>
            <p style={{ color: '#64748b', fontSize: '12px', margin: '4px 0 16px' }}>
              Status terkonfirmasi kontributor warga mandiri untuk bukti fasilitas publik Surabaya.
            </p>
            {data.mode === 'supabase' && (
              <button type="button" className="secondary-action" onClick={signOut} style={{ alignSelf: 'flex-start' }}>
                Keluar dari Akun
              </button>
            )}
          </article>

          <article className="card">
            <div className="card-title-row" style={{ marginBottom: '12px' }}>
              <h2>Laporan Terbaru</h2>
              <span className="count-pill">{data.reports.length} item</span>
            </div>
            {data.reports.length ? (
              <div style={{ display: 'grid', gap: '8px', maxHeight: '400px', overflowY: 'auto' }}>
                {data.reports.map((r) => (
                  <div
                    key={r.id}
                    style={{
                      padding: '10px 12px',
                      background: '#f8fafc',
                      borderRadius: '10px',
                      border: '1px solid var(--line)',
                      fontSize: '12px',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', fontWeight: 700 }}>
                      <span>{r.reporterName}</span>
                      <span style={{ fontSize: '10px', color: '#64748b' }}>
                        {new Date(r.createdAt).toLocaleDateString('id-ID')}
                      </span>
                    </div>
                    <div style={{ color: '#64748b', fontSize: '11px', marginTop: '3px' }}>
                      Status: {r.elements.map((e) => e.status).join(', ')}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ color: '#64748b', fontSize: '13px' }}>
                Belum ada laporan tersimpan. Mulai berkontribusi dengan mengambil foto fasilitas publik dan checklist lapangan.
              </p>
            )}
          </article>
        </div>
      )}
    </div>
  );
}
