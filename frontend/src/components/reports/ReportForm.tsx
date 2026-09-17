'use client';

import React, { useState, useRef } from 'react';
import { Place, ChainElementCode, AccessibilityStatus, CHAIN_ELEMENT_MAP } from '@/types';
import { Icon } from '@/components/ui/Icon';
import { AIDraftPanel } from './AIDraftPanel';
import { HumanLockSelector } from './HumanLockSelector';

type ReportFormProps = {
  places: Place[];
  defaultPlaceName?: string;
  onSubmitReport: (
    placeName: string,
    elementCode: ChainElementCode,
    status: AccessibilityStatus,
    note: string,
    photoUrl: string | null
  ) => void;
};

export function ReportForm({
  places,
  defaultPlaceName,
  onSubmitReport,
}: ReportFormProps) {
  const [placeName, setPlaceName] = useState(defaultPlaceName ?? places[0]?.name ?? '');
  const [elementCode, setElementCode] = useState<ChainElementCode>('E5');
  const [status, setStatus] = useState<AccessibilityStatus>('TERHALANG');
  const [note, setNote] = useState('');
  const [aiDraftReady, setAiDraftReady] = useState(false);
  const [uploadedPhotoUrl, setUploadedPhotoUrl] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setUploadedPhotoUrl(url);
      setAiDraftReady(true);
    }
  }

  function handleUploadBoxClick() {
    setAiDraftReady(true);
    fileInputRef.current?.click();
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSubmitReport(placeName, elementCode, status, note, uploadedPhotoUrl);
    setIsSuccess(true);
  }

  const selectedElementLabel = CHAIN_ELEMENT_MAP[elementCode]?.label ?? 'Elemen';

  return (
    <div className="page-scroll">
      <div className="page-title">
        <div>
          <span className="eyebrow">Flagship Loop Pelaporan</span>
          <h1>Foto → Draf AI → Kunci Manusia</h1>
          <p>
            Laporkan kondisi riil fasilitas aksesibilitas di Surabaya. AI membantu identifikasi objek; keputusan kelayakan dan keamanan selalu dikunci oleh kontributor manusia.
          </p>
        </div>
        <div className="safety-note" role="note">
          <Icon name="shield" />
          <span>
            Tidak ada pengukuran cm sudut atau vonis kelayakan legal dari satu foto. Manusia adalah kunci kebenaran data.
          </span>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="report-grid">
        {/* Kolom 1: Bukti Lapangan */}
        <section className="card form-card" aria-label="1. Form bukti lapangan">
          <h2>1. Bukti Lapangan</h2>

          <label htmlFor="report-location-select">
            Lokasi Fasilitas
            <select
              id="report-location-select"
              value={placeName}
              onChange={(e) => setPlaceName(e.target.value)}
              required
            >
              {places.map((p) => (
                <option key={p.id} value={p.name}>
                  {p.name} ({p.district})
                </option>
              ))}
            </select>
          </label>

          <label htmlFor="report-element-select">
            Elemen Aksesibilitas (Rantai 8 Elemen)
            <select
              id="report-element-select"
              value={elementCode}
              onChange={(e) => setElementCode(e.target.value as ChainElementCode)}
              required
            >
              {(Object.keys(CHAIN_ELEMENT_MAP) as ChainElementCode[]).map((code) => (
                <option key={code} value={code}>
                  {code} — {CHAIN_ELEMENT_MAP[code].label} ({CHAIN_ELEMENT_MAP[code].full})
                </option>
              ))}
            </select>
          </label>

          <div>
            <span className="field-label-text">Foto Bukti Lapangan</span>
            <input
              type="file"
              ref={fileInputRef}
              id="file-upload-input"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={handlePhotoUpload}
            />
            <div
              id="report-upload-box"
              className="upload-box"
              onClick={handleUploadBoxClick}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleUploadBoxClick();
                }
              }}
              aria-label="Pilih foto bukti dari perangkat atau klik untuk simulasi analisis AI"
            >
              <Icon name="camera" size={34} />
              <strong>Unggah Foto Fasilitas</strong>
              <span>Klik untuk memilih file foto nyata atau simulasi deteksi AI</span>
              <small>Format JPG/PNG · Formulir tetap dapat diisi mandiri jika AI gagal</small>
            </div>
          </div>

          <label htmlFor="report-notes">
            Catatan Penggunaan Lapangan
            <textarea
              id="report-notes"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Contoh: Guiding block tertutup oleh dua sepeda motor parkir di depan pintu masuk sisi timur halte."
              rows={4}
            />
          </label>
        </section>

        {/* Kolom 2: AI Vision Draft & Kunci Manusia */}
        <section className="card ai-card" aria-label="2. Analisis AI dan penguncian manusia">
          <AIDraftPanel
            isDraftReady={aiDraftReady}
            uploadedPhotoUrl={uploadedPhotoUrl}
            detectedElementLabel={selectedElementLabel}
          />

          <HumanLockSelector
            currentStatus={status}
            onSelectStatus={setStatus}
          />

          <button
            id="btn-submit-report"
            type="submit"
            className="primary-action"
            style={{ width: '100%', marginTop: '20px' }}
          >
            Publish Setelah Konfirmasi Manusia
          </button>

          {isSuccess && (
            <div className="success-toast" role="status">
              ✓ Laporan berhasil disimpan! Status lokasi pada peta Surabaya telah diperbarui.
            </div>
          )}
        </section>
      </form>
    </div>
  );
}
