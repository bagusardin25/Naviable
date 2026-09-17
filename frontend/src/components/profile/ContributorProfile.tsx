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
  return <div className="page-scroll profile-page">
    <section className="profile-hero"><div><span className="eyebrow">Kontributor Komunitas</span><h1>{data?.mode === 'local' ? 'Kontribusi perangkat lokal' : 'Kontribusi saya'}</h1><p>Riwayat laporan yang tersimpan di server.</p></div></section>
    {error && <p role="alert">{error} <a href="/login">Masuk</a></p>}
    {!data && !error && <p role="status">Memuat kontribusi…</p>}
    {data && <div className="profile-grid"><article className="card"><h2>Laporan tersimpan</h2><strong className="big-number">{data.total}</strong><p>Konfirmasi kontributor tidak sama dengan audit tim atau kepatuhan hukum.</p>{data.mode === 'supabase' && <button type="button" onClick={signOut}>Keluar</button>}</article><article className="card"><h2>50 laporan terbaru</h2>{data.reports.length ? data.reports.map(r => <p key={r.id}>{r.reporterName} · {new Date(r.createdAt).toLocaleString('id-ID')} · {r.elements.map(e => e.status).join(', ')}</p>) : <p>Belum ada laporan. Mulai dengan foto fasilitas dan checklist lapangan.</p>}</article></div>}
  </div>;
}
