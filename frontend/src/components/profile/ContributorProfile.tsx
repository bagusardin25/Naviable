import React from 'react';

export function ContributorProfile() {
  return (
    <div className="page-scroll profile-page">
      <section className="profile-hero" aria-label="Informasi profil kontributor">
        <div className="avatar large" aria-hidden="true">
          AR
        </div>
        <div>
          <span className="eyebrow">Kontributor Komunitas</span>
          <h1>Ahmad Rizki</h1>
          <p>Kontributor Terverifikasi · Kota Surabaya</p>
        </div>
      </section>

      <div className="profile-grid">
        <article className="card">
          <h2>Kontribusi Terverifikasi</h2>
          <strong className="big-number">14</strong>
          <p>
            Laporan bukti foto terstruktur. Validasi langsung pada rantai 8 elemen aksesibilitas ruang publik kota Surabaya, bukan sekadar penambahan pin tanpa konteks.
          </p>
        </article>

        <article className="card">
          <h2>Prinsip Komunitas Naviable</h2>
          <ul className="principles-list">
            <li>
              <strong>Foto Nyata & Objektif:</strong> Bukti foto harus jelas menunjukkan kondisi fisik fasilitas di lapangan.
            </li>
            <li>
              <strong>Kunci Manusia:</strong> AI hanya alat bantu pendeteksi awal; penentu status aman/tidaknya fasilitas selalu dikonfirmasi manusia.
            </li>
            <li>
              <strong>Koreksi Terbuka:</strong> Kondisi lapangan dinamis. Setiap pengguna dapat mengajukan koreksi bukti jika ada renovasi atau hambatan baru.
            </li>
          </ul>
        </article>
      </div>
    </div>
  );
}
