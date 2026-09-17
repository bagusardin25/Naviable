'use client';

import React, { useState, useMemo } from 'react';
import {
  Place,
  Screen,
  AccessibilityNeed,
  ChainElementCode,
  AccessibilityStatus,
  PreSurveyFilter,
} from '@/types';
import { loadSeedPlaces } from '@/lib/places/seedAdapter';
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
  const [places, setPlaces] = useState<Place[]>(() => loadSeedPlaces());
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(() => {
    const seed = loadSeedPlaces();
    return seed[0] ?? null;
  });
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

  function handleSubmitReport(
    placeName: string,
    elementCode: ChainElementCode,
    newStatus: AccessibilityStatus,
    note: string,
    photoUrl: string | null
  ) {
    const target = places.find((p) => p.name === placeName);
    if (!target) return;

    const nextPlaces = places.map((p) => {
      if (p.id !== target.id) return p;

      const updatedElements = p.elements.map((el) => {
        if (el.code === elementCode) {
          return {
            ...el,
            status: newStatus,
            note: note.trim() || 'Status dikonfirmasi kontributor dari verifikasi lapangan terkini.',
            photoUrl: photoUrl ?? el.photoUrl,
            lockedBy: 'kontributor' as const,
            isPreSurveyEvidence: false,
          };
        }
        return el;
      });

      // Recalculate overall status based on worst status
      const statuses = updatedElements.map((e) => e.status);
      let severe: AccessibilityStatus = 'UTUH';
      if (statuses.includes('TIDAK_ADA')) severe = 'TIDAK_ADA';
      else if (statuses.includes('TERHALANG')) severe = 'TERHALANG';
      else if (statuses.includes('TIDAK_STANDAR')) severe = 'TIDAK_STANDAR';
      else if (statuses.includes('BELUM_DIKETAHUI')) severe = 'BELUM_DIKETAHUI';

      const brokenLabels = updatedElements
        .filter((e) => ['TERHALANG', 'TIDAK_STANDAR', 'TIDAK_ADA'].includes(e.status))
        .map((e) => e.label.toLowerCase());

      const summary = brokenLabels.length
        ? `Rantai perlu perhatian pada ${brokenLabels.slice(0, 2).join(' dan ')}.`
        : 'Rantai akses terkonfirmasi utuh dan mandiri.';

      return {
        ...p,
        elements: updatedElements,
        overall: severe,
        chainSummary: summary,
        updated: 'Baru saja (Diverifikasi kontributor)',
        photos: photoUrl ? p.photos + 1 : p.photos,
      };
    });

    setPlaces(nextPlaces);
    const updatedTarget = nextPlaces.find((p) => p.id === target.id) ?? null;
    setSelectedPlace(updatedTarget);

    setTimeout(() => {
      setScreen('map');
    }, 1000);
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
            defaultPlaceName={reportTargetPlaceName}
            onSubmitReport={handleSubmitReport}
          />
        )}

        {screen === 'dashboard' && (
          <div className="page-scroll dashboard-page">
            <div className="page-title">
              <div>
                <span className="eyebrow">Civic Observatory</span>
                <h1>Evidence Pack Surabaya (Seed Data)</h1>
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
