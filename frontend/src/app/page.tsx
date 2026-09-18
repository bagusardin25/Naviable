'use client';

import React, { useState, useMemo, useEffect } from 'react';
import {
  Place,
  Screen,
  AccessibilityNeed,
  ProfileStatusFilter,
  calculatePlaceProfileStatus,
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
import { DataQualityCard } from '@/components/observatory/DataQualityCard';
import { JourneyPlanner } from '@/components/journey/JourneyPlanner';
import { ContributorProfile } from '@/components/profile/ContributorProfile';
import { AccessibilityModal } from '@/components/accessibility/AccessibilityModal';
import { Icon } from '@/components/ui/Icon';

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
  const [statusFilter, setStatusFilter] = useState<ProfileStatusFilter>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [showA11y, setShowA11y] = useState(false);
  const [showJourney, setShowJourney] = useState(false);
  const [reportTargetPlaceName, setReportTargetPlaceName] = useState<string | undefined>(undefined);
  const [mobileTab, setMobileTab] = useState<'map' | 'list'>('map');

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

  // Counts for each profile-evaluated status filter pill
  const statusCounts = useMemo(() => {
    const counts: Record<ProfileStatusFilter, number> = {
      all: places.length,
      UTUH: 0,
      TERHALANG: 0,
      TIDAK_STANDAR: 0,
      TIDAK_ADA: 0,
      BELUM_DIKETAHUI: 0,
    };
    for (const p of places) {
      const status = calculatePlaceProfileStatus(p, need).status;
      if (counts[status] !== undefined) counts[status]++;
    }
    return counts;
  }, [places, need]);

  // Multi-criteria filter: search query + profile-evaluated status + category
  const filteredPlaces = useMemo(() => {
    return places.filter((p) => {
      // 1. Status Filter by active profile
      if (statusFilter !== 'all') {
        const profileStatus = calculatePlaceProfileStatus(p, need).status;
        if (profileStatus !== statusFilter) return false;
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
  }, [places, statusFilter, categoryFilter, searchQuery, need]);

  // Screen reader polite live announcement for search & profile updates
  const liveAnnouncement = !loading
    ? `Menampilkan ${filteredPlaces.length} tempat untuk kebutuhan ${need}${
        statusFilter !== 'all' ? `, kondisi ${statusFilter}` : ''
      }.`
    : 'Memuat data tempat dari server…';


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
      <a href="#main-content" className="skip-link">
        Lewati ke konten utama
      </a>
      <div role="status" aria-live="polite" aria-atomic="true" className="visually-hidden">
        {liveAnnouncement}
      </div>

      <AppSidebar currentScreen={screen} onSelectScreen={setScreen} />

      <section id="main-content" className="workspace">
        <TopNavbar
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onOpenAccessibility={() => setShowA11y(true)}
        />

        {loading && <p role="status" style={{ padding: '10px 20px' }}>Memuat data tempat dari server…</p>}
        {apiError && <div role="alert" style={{ padding: '10px 20px' }}>{apiError} <button type="button" onClick={() => { setLoading(true); setReload(value => value + 1); }}>Coba lagi</button></div>}
        {storage === 'local' && <p role="note" style={{ padding: '6px 20px', background: '#fffbeb', fontSize: '12px' }}>Mode lokal · Laporan tersimpan di peramban ini.</p>}
        {screen === 'map' && (
          <>
            <div className="mobile-view-tabs" role="tablist" aria-label="Pilih tampilan peta atau daftar">
              <button
                type="button"
                role="tab"
                aria-selected={mobileTab === 'map'}
                className={`mobile-view-btn ${mobileTab === 'map' ? 'active' : ''}`}
                onClick={() => setMobileTab('map')}
              >
                <Icon name="map" size={15} />
                <span>Peta</span>
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={mobileTab === 'list'}
                className={`mobile-view-btn ${mobileTab === 'list' ? 'active' : ''}`}
                onClick={() => setMobileTab('list')}
              >
                <Icon name="list" size={15} />
                <span>Daftar ({filteredPlaces.length})</span>
              </button>
            </div>

            <div className="map-layout">
              <h1 className="visually-hidden">Naviable — Peta Aksesibilitas Kota Surabaya</h1>

              <section
                className={`map-panel ${mobileTab !== 'map' ? 'mobile-hidden' : 'mobile-active'}`}
                aria-label="Peta interaktif aksesibilitas Surabaya"
              >
                <div className="map-toolbar">
                  <NeedFilterTabs currentNeed={need} onSelectNeed={setNeed} />

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <button
                      id="btn-toggle-journey"
                      type="button"
                      className={`status-pill-btn ${showJourney ? 'active' : ''}`}
                      style={
                        showJourney
                          ? { background: '#6d45cc', color: '#ffffff', borderColor: '#5632b6' }
                          : { borderColor: '#c4b5fd', color: '#6d45cc', background: '#f5f3ff' }
                      }
                      onClick={() => setShowJourney(!showJourney)}
                      title="Buka petunjuk rute akses"
                    >
                      <Icon name="compass" size={14} />
                      <span>Petunjuk Rute</span>
                    </button>

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
                        <Icon name="close" size={13} />
                        <span>Reset Filter</span>
                      </button>
                    )}
                  </div>
                </div>

                {showJourney && (
                  <JourneyPlanner
                    places={places}
                    currentNeed={need}
                    onSelectPlace={handleSelectPlace}
                    onClose={() => setShowJourney(false)}
                  />
                )}

                {/* Status Filter Bar evaluated dynamically for active need profile */}
                <div className="status-filter-bar" role="toolbar" aria-label={`Filter kondisi untuk kebutuhan ${need}`}>
                  <span style={{ fontSize: '11px', fontWeight: 700, color: '#475569', whiteSpace: 'nowrap', marginRight: '4px' }}>
                    Kondisi ({need}):
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
                    className={`status-pill-btn ${statusFilter === 'UTUH' ? 'active' : ''}`}
                    onClick={() => setStatusFilter('UTUH')}
                  >
                    <Icon name="check-circle" size={13} />
                    <span>Bisa Digunakan ({statusCounts.UTUH})</span>
                  </button>
                  <button
                    type="button"
                    className={`status-pill-btn ${statusFilter === 'TERHALANG' ? 'active' : ''}`}
                    onClick={() => setStatusFilter('TERHALANG')}
                  >
                    <Icon name="warning" size={13} />
                    <span>Terhalang ({statusCounts.TERHALANG})</span>
                  </button>
                  <button
                    type="button"
                    className={`status-pill-btn ${statusFilter === 'TIDAK_STANDAR' ? 'active' : ''}`}
                    onClick={() => setStatusFilter('TIDAK_STANDAR')}
                  >
                    <Icon name="alert-circle" size={13} />
                    <span>Perlu Perhatian ({statusCounts.TIDAK_STANDAR})</span>
                  </button>
                  <button
                    type="button"
                    className={`status-pill-btn ${statusFilter === 'TIDAK_ADA' ? 'active' : ''}`}
                    onClick={() => setStatusFilter('TIDAK_ADA')}
                  >
                    <Icon name="x-circle" size={13} />
                    <span>Tidak Ada ({statusCounts.TIDAK_ADA})</span>
                  </button>
                  <button
                    type="button"
                    className={`status-pill-btn ${statusFilter === 'BELUM_DIKETAHUI' ? 'active' : ''}`}
                    onClick={() => setStatusFilter('BELUM_DIKETAHUI')}
                  >
                    <Icon name="help-circle" size={13} />
                    <span>Belum Diketahui ({statusCounts.BELUM_DIKETAHUI})</span>
                  </button>
                </div>

                <MapView
                  places={filteredPlaces}
                  selectedPlace={selectedPlace}
                  onSelectPlace={handleSelectPlace}
                  activeNeed={need}
                />
              </section>

              <PlaceList
                places={filteredPlaces}
                selectedPlace={selectedPlace}
                onSelectPlace={handleSelectPlace}
                activeNeed={need}
                className={mobileTab !== 'list' ? 'mobile-hidden' : ''}
              />

              {selectedPlace && (
                <div
                  className="drawer-backdrop"
                  onClick={() => setSelectedPlace(null)}
                  aria-hidden="true"
                />
              )}

              <PlaceDetailDrawer
                place={selectedPlace}
                onClose={() => setSelectedPlace(null)}
                onCorrectPlace={handleCorrectPlace}
                activeNeed={need}
              />
            </div>
          </>
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
                <span className="eyebrow">Data & Riset Warga</span>
                <h1>Data Keterbukaan Akses Surabaya</h1>
                <p>
                  Ringkasan kondisi ruang publik dari pengamatan warga Surabaya untuk komunitas disabilitas, pegiat advokasi, dan perencana kota.
                </p>
              </div>
              <EvidenceExportButton places={places} />
            </div>

            <DashboardStats places={places} />
            <DataQualityCard places={places} />

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
