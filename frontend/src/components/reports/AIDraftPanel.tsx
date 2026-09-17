import React from 'react';
import Image from 'next/image';
import { Icon } from '@/components/ui/Icon';

type AIDraftPanelProps = {
  isDraftReady: boolean;
  uploadedPhotoUrl: string | null;
  detectedElementLabel: string;
};

export function AIDraftPanel({
  isDraftReady,
  uploadedPhotoUrl,
  detectedElementLabel,
}: AIDraftPanelProps) {
  return (
    <div className="ai-draft-section">
      <div className="card-title-row">
        <div>
          <span className="eyebrow">AI Assistant</span>
          <h2>2. Draf Analisis Gambar</h2>
        </div>
        <span className={`live-pill ${isDraftReady ? 'ready' : ''}`}>
          {isDraftReady ? 'Draf siap' : 'Menunggu foto'}
        </span>
      </div>

      <div className="vision-stage" aria-label="Simulasi pemrosesan citra AI">
        <div className="scan-line" />
        {uploadedPhotoUrl ? (
          <Image
            src={uploadedPhotoUrl}
            alt="Foto bukti lapangan yang diunggah"
            width={280}
            height={140}
            unoptimized
            className="vision-preview-img"
            style={{ objectFit: 'contain' }}
          />
        ) : (
          <Icon name="photo" size={54} />
        )}
        <span>
          {isDraftReady
            ? `Objek terdeteksi: ${detectedElementLabel.toLowerCase()}, trotoar sekitar, permukaan transisi`
            : 'Pratinjau bukti foto akan tampil di sini'}
        </span>
      </div>

      <div className="ai-result" role="region" aria-label="Saran checklist AI">
        <strong>
          {isDraftReady
            ? `Saran Draf AI: Teridentifikasi ${detectedElementLabel}`
            : 'Belum ada analisis AI'}
        </strong>
        <span>
          {isDraftReady
            ? 'Keyakinan deteksi: Sedang · Diperlukan verifikasi & penguncian kontributor manusia'
            : 'Tidak ada status yang dipublikasi tanpa persetujuan manusia.'}
        </span>
      </div>

      <div className="ai-disclaimer" role="note">
        <Icon name="shield" size={16} />
        <small>
          AI hanya menghasilkan draf pengenalan objek. AI tidak melakukan pengukuran sudut/kemiringan cm, dan bukan penilai kepatuhan hukum PUPR.
        </small>
      </div>
    </div>
  );
}
