'use client';

import React, { useState, useMemo, useEffect } from 'react';
import {
  Place,
  Screen,
  AccessibilityNeed,
  PreSurveyFilter,
} from '@/types';
import { fetchPlaces, fetchHealth } from '@/lib/api';
import { useAccessibility } from '@/hooks/useAccessibility';

import { AppSidebar } from '@/components/layout/AppSidebar';
import { TopNavbar } from '@/components/layout/TopNavbar';
import { NeedFilterTabs } from '@/components/navigation/NeedFilterTabs';
import { MapView } from '@/components/map/MapView';
import { PlaceList } from '@/components/places/PlaceList';
import { PlaceDetailDrawer } from '@/components/places/PlaceDetailDrawer';
import { ReportForm } from '@/components/reports/ReportForm';
import { DashboardStats } from '@/components/observatory/DashboardStats';
import { StatusDistribution } from '@/components/observatory/StatusDistribution';
import { DistrictSnapshot } from '@/components/observatory/DistrictSnapshot';
import { EvidenceExportButton } from '@/components/observatory/EvidenceExportButton';
import { ContributorProfile } from '@/components/profile/ContributorProfile';
import { AccessibilityModal } from '@/components/accessibility/AccessibilityModal';

export default function Home() {
  const [screen, setScreen] = useState<Screen>('map');
  const [places, setPlaces] = useState<Place[]>([]);
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState('');
  const [storage, setStorage] = useState('');
  const [reload, setReload] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [need, setNeed] = useState<AccessibilityNeed>('Mobilitas');
  const [statusFilter, setStatusFilter] = useState<PreSurveyFilter>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [showA11y, setShowA11y] = useState(false);
  const [reportTargetPlaceName, setReportTargetPlaceName] = useState<string | undefined>(undefined);

  const {
    settings,
    setContrast,
    setLargeText,
    setReduceMotion,
    setDyslexia,
    resetSettings,
  } = useAccessibility();

  useEffect(() => {
    let active = true;
    Promise.all([fetchPlaces(need.toLowerCase()), fetchHealth()]).then(([next, health]) => {
      if (!active) return;
      setPlaces(next);
      setSelectedPlace(current => current ? next.find(p => p.id === current.id) ?? null : null);
      setStorage(health.storage);
      setApiError('');
    }).catch(error => {
      if (active) setApiError(error instanceof Error ? error.message : 'Gagal memuat data API');
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [need, reload]);

  // Dynamic unique categories
  const availableCategories = useMemo(() => {
    const cats = Array.from(new Set(places.map((p) => p.category))).sort();
    return cats;
  }, [places]);

  // Counts for each status filter pill
  const statusCounts = useMemo(() => {
    return {
      all: places.length,
      yes: places.filter((p) => p.wheelchairStatus === 'yes').length,
      limited: places.filter((p) => p.wheelchairStatus === 'limited').length,
      no: places.filter((p) => p.wheelchairStatus === 'no').length,
      unknown: places.filter((p) => p.wheelchairStatus === 'unknown').length,
      'needs-geocoding': places.filter((p) => p.needsGeocoding).length,
    };
  }, [places]);

  // Multi-criteria filter: search query + status + category
  const filteredPlaces = useMemo(() => {
    return places.filter((p) => {
      // 1. Status Filter
      if (statusFilter === 'needs-geocoding') {
        if (!p.needsGeocoding) return false;
      } else if (statusFilter !== 'all') {
        if (p.wheelchairStatus !== statusFilter) return false;
      }

      // 2. Category Filter
      if (categoryFilter !== 'all' && p.category !== categoryFilter) {
        return false;
      }

      // 3. Search text query
      const query = searchQuery.trim().toLowerCase();
      if (query) {
        const matchName = p.name.toLowerCase().includes(query);
        const matchCategory = p.category.toLowerCase().includes(query);
        const matchDistrict = p.district.toLowerCase().includes(query);
        const matchAddress = p.address ? p.address.toLowerCase().includes(query) : false;
        if (!matchName && !matchCategory && !matchDistrict && !matchAddress) {
          return false;
        }
      }

      return true;
    });
  }, [places, statusFilter, categoryFilter, searchQuery]);

  function handleSelectPlace(place: Place) {
    setSelectedPlace(place);
  }

  function handleCorrectPlace(place: Place) {
    setReportTargetPlaceName(place.name);
    setScreen('report');
  }

  function handleSubmitReport(updated: Place) {
    setPlaces(current => current.map(p => p.id === updated.id ? updated : p));
    setSelectedPlace(updated);
    setReload(value => value + 1);
    setScreen('map');
  }

  const appClassName = [
    'app-shell',
    settings.contrast ? 'contrast-mode' : '',
    settings.largeText ? 'large-text' : '',
    settings.reduceMotion ? 'reduce-motion' : '',
    settings.dyslexia ? 'dyslexia-mode' : '',
  ]
    .filter(Boolean)
    .join(' ');

  const hasActiveFilters =
    statusFilter !== 'all' || categoryFilter !== 'all' || searchQuery.trim().length > 0;

  return (
    <main className={appClassName}>
      <AppSidebar currentScreen={screen} onSelectScreen={setScreen} />

      <section className="workspace">
        <TopNavbar
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onOpenAccessibility={() => setShowA11y(true)}
        />

        {loading && <p role="status" style={{ padding: '10px 20px' }}>Memuat lokasi dari server…</p>}
        {apiError && <div role="alert" style={{ padding: '10px 20px' }}>{apiError} <button type="button" onClick={() => { setLoading(true); setReload(value => value + 1); }}>Coba lagi</button></div>}
        {storage === 'local' && <p role="note" style={{ padding: '6px 20px', background: '#fffbeb', fontSize: '12px' }}>Mode lokal · Laporan tersimpan di perangkat ini. Data awal tetap pra-survei.</p>}
        {screen === 'map' && (
          <div className="map-layout">
            <h1 className="visually-hidden">Naviable — Peta Aksesibilitas Kota Surabaya</h1>

            <section className="map-panel" aria-label="Peta interaktif aksesibilitas Surabaya">
              <div className="map-toolbar">
                <NeedFilterTabs currentNeed={need} onSelectNeed={setNeed} />

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <select
                    id="category-filter-select"
                    className="filter-select"
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    aria-label="Filter berdasarkan kategori lokasi"
                  >
                    <option value="all">Semua Kategori ({places.length})</option>
                    {availableCategories.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat} ({places.filter((p) => p.category === cat).length})
                      </option>
                    ))}
                  </select>

                  {hasActiveFilters && (
                    <button
                      type="button"
                      className="status-pill-btn"
                      style={{ color: '#dc2626', borderColor: '#fca5a5', background: '#fef2f2' }}
                      onClick={() => {
                        setStatusFilter('all');
                        setCategoryFilter('all');
                        setSearchQuery('');
                      }}
                      title="Reset semua filter"
                    >
                      ✕ Reset Filter
                    </button>
                  )}
                </div>
              </div>

              {/* Status Filter Bar for Pre-Survey Indicators */}
              <div
                className="status-filter-bar"
                style={{
                  padding: '8px 20px',
                  background: '#f8fafc',
                  borderBottom: '1px solid var(--line)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  overflowX: 'auto',
                  zIndex: 3,
                  position: 'relative',
                }}
              >
                <span style={{ fontSize: '11px', fontWeight: 800, color: '#475569', whiteSpace: 'nowrap', marginRight: '4px' }}>
                  Status Pre-Survey:
                </span>
                <button
                  type="button"
                  className={`status-pill-btn ${statusFilter === 'all' ? 'active' : ''}`}
                  onClick={() => setStatusFilter('all')}
                >
                  Semua ({statusCounts.all})
                </button>
                <button
                  type="button"
                  className={`status-pill-btn ${statusFilter === 'yes' ? 'active' : ''}`}
                  onClick={() => setStatusFilter('yes')}
                >
                  ✓ Akses Dilaporkan ({statusCounts.yes})
                </button>
                <button
                  type="button"
                  className={`status-pill-btn ${statusFilter === 'limited' ? 'active' : ''}`}
                  onClick={() => setStatusFilter('limited')}
                >
                  ▲ Akses Terbatas ({statusCounts.limited})
                </button>
                <button
                  type="button"
                  className={`status-pill-btn ${statusFilter === 'no' ? 'active' : ''}`}
                  onClick={() => setStatusFilter('no')}
                >
                  ✕ Tidak Aksesibel ({statusCounts.no})
                </button>
                <button
                  type="button"
                  className={`status-pill-btn ${statusFilter === 'unknown' ? 'active' : ''}`}
                  onClick={() => setStatusFilter('unknown')}
                >
                  ? Belum Diketahui ({statusCounts.unknown})
                </button>
                <button
                  type="button"
                  className={`status-pill-btn ${statusFilter === 'needs-geocoding' ? 'active' : ''}`}
                  onClick={() => setStatusFilter('needs-geocoding')}
                  style={
                    statusFilter === 'needs-geocoding'
                      ? {}
                      : { borderColor: '#fde68a', background: '#fffbeb', color: '#92400e' }
                  }
                >
                  📍 Perlu Geocoding ({statusCounts['needs-geocoding']})
                </button>
              </div>

              <MapView
                places={filteredPlaces}
                selectedPlace={selectedPlace}
                onSelectPlace={handleSelectPlace}
              />
            </section>

            <PlaceList
              places={filteredPlaces}
              selectedPlace={selectedPlace}
              onSelectPlace={handleSelectPlace}
            />

            <PlaceDetailDrawer
              place={selectedPlace}
              onClose={() => setSelectedPlace(null)}
              onCorrectPlace={handleCorrectPlace}
            />
          </div>
        )}

        {screen === 'report' && (
          <ReportForm
            places={places}
            key={reportTargetPlaceName ?? "new-report"}
            defaultPlaceName={reportTargetPlaceName}
            onSubmitReport={handleSubmitReport}
          />
        )}

        {screen === 'dashboard' && (
          <div className="page-scroll dashboard-page">
            <div className="page-title">
              <div>
                <span className="eyebrow">Civic Observatory</span>
                <h1>Evidence Pack Surabaya</h1>
                <p>
                  Ringkasan aksesibilitas ruang publik untuk komunitas disabilitas, kampus, NGO advokasi, dan perencana kota — bukan sistem penghukuman pemerintah.
                </p>
              </div>
              <EvidenceExportButton places={places} />
            </div>

            <DashboardStats places={places} />

            <div className="dashboard-grid">
              <StatusDistribution places={places} />
              <DistrictSnapshot places={places} />
            </div>
          </div>
        )}

        {screen === 'profile' && <ContributorProfile />}
      </section>

      <AccessibilityModal
        isOpen={showA11y}
        onClose={() => setShowA11y(false)}
        settings={settings}
        onToggleContrast={() => setContrast(!settings.contrast)}
        onToggleLargeText={() => setLargeText(!settings.largeText)}
        onToggleReduceMotion={() => setReduceMotion(!settings.reduceMotion)}
        onToggleDyslexia={() => setDyslexia(!settings.dyslexia)}
        onReset={resetSettings}
      />
    </main>
  );
}
