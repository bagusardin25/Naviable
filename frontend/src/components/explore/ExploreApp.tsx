'use client';

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { findBestMatchingPlace } from '@/lib/voice-search';
import { useRouter, useSearchParams } from 'next/navigation';
import { loginHref, parseScreen, screenHref } from '@/lib/navigation';
import { useAuth } from '@/hooks/useAuth';
import {
  Place,
  Screen,
  AccessibilityNeed,
  ProfileStatusFilter,
  calculatePlaceProfileStatus,
} from '@/types';
import { fetchPlaces } from '@/lib/api';
import { useAccessibility } from '@/hooks/useAccessibility';

import { AppSidebar } from '@/components/layout/AppSidebar';
import { TopNavbar } from '@/components/layout/TopNavbar';
import { NeedFilterTabs } from '@/components/navigation/NeedFilterTabs';
import { MapView } from '@/components/map/MapView';
import { PlaceList } from '@/components/places/PlaceList';
import { PlaceDetailDrawer } from '@/components/places/PlaceDetailDrawer';
import { ReportForm } from '@/components/reports/ReportForm';
import { ReviewForm } from '@/components/places/ReviewForm';
import { DashboardStats } from '@/components/observatory/DashboardStats';
import { StatusDistribution } from '@/components/observatory/StatusDistribution';
import { DistrictSnapshot } from '@/components/observatory/DistrictSnapshot';
import { DataQualityCard } from '@/components/observatory/DataQualityCard';
import { JourneyPlanner } from '@/components/journey/JourneyPlanner';
import { ContributorProfile } from '@/components/profile/ContributorProfile';
import { AuthModal } from '@/components/auth/AuthModal';
import { Icon } from '@/components/ui/Icon';

export default function ExploreApp() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const screen = parseScreen(searchParams.get('screen'));
  const auth = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authModalShownFor, setAuthModalShownFor] = useState<string | null>(null);
  const latParam = searchParams.get('lat');
  const lngParam = searchParams.get('lng');
  const initialMapLocation = useMemo(() => {
    if (!latParam || !lngParam) return undefined;
    const lat = parseFloat(latParam);
    const lng = parseFloat(lngParam);
    if (Number.isFinite(lat) && Number.isFinite(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
      return { lat, lng };
    }
    return undefined;
  }, [latParam, lngParam]);

  useEffect(() => {
    if (screen === 'review' && auth.ready && !auth.user && authModalShownFor !== 'review') {
      const timer = setTimeout(() => {
        setAuthModalShownFor('review');
        setShowAuthModal(true);
        router.push(screenHref('map', searchParams.toString()));
      }, 0);
      return () => clearTimeout(timer);
    }
    if (screen === 'add' && auth.ready && !auth.user && authModalShownFor !== 'add') {
      const timer = setTimeout(() => {
        setAuthModalShownFor('add');
        setShowAuthModal(true);
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [screen, auth.ready, auth.user, authModalShownFor, router, searchParams]);

  function handleAddPlaceAtLocation(location: { lat: number; lng: number }) {
    const latStr = location.lat.toFixed(6);
    const lngStr = location.lng.toFixed(6);
    const targetUrl = `/jelajah?screen=add&lat=${latStr}&lng=${lngStr}`;

    if (!auth.user) {
      router.push(targetUrl);
      setShowAuthModal(true);
    } else {
      router.push(targetUrl);
    }
  }

  const setScreen = useCallback((next: Screen) => {
    if (next === 'profile' && !auth.user) {
      setShowAuthModal(true);
      return;
    }
    if (next === 'review' && !auth.user) {
      setShowAuthModal(true);
      return;
    }
    if (next === 'add' && !auth.user) {
      setShowAuthModal(true);
    }
    if (next !== screen) {
      router.push(screenHref(next, searchParams.toString()));
    }
  }, [auth.user, screen, router, searchParams]);
  const [places, setPlaces] = useState<Place[]>([]);
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState('');
  const [reload, setReload] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [need, setNeed] = useState<AccessibilityNeed>('Mobilitas');
  const [statusFilter, setStatusFilter] = useState<ProfileStatusFilter>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [showJourney, setShowJourney] = useState(false);
  const [mobileTab, setMobileTab] = useState<'map' | 'list'>('map');
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  const { toggleWidget } = useAccessibility();

  useEffect(() => {
    let active = true;
    fetchPlaces(need.toLowerCase()).then(next => {
      if (!active) return;
      setPlaces(next);
      setSelectedPlace(current => current ? next.find(p => p.id === current.id) ?? null : null);
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

  const [customAnnouncement, setCustomAnnouncement] = useState<string | null>(null);

  // Screen reader polite live announcement for search & profile updates
  const liveAnnouncement = customAnnouncement
    ? customAnnouncement
    : !loading
    ? `Menampilkan ${filteredPlaces.length} tempat untuk kebutuhan ${need}${
        statusFilter !== 'all' ? `, kondisi ${statusFilter}` : ''
      }.`
    : 'Memuat data tempat dari server…';

  const handleSearchSubmit = useCallback(
    (query: string) => {
      const clean = query.trim();
      if (!clean) return;

      const match = findBestMatchingPlace(clean, places);
      if (match && match.isSpecificMatch) {
        // Otomatis arahkan dan pilih tempat yang cocok (shallow copy agar map pan controller selalu trigger)
        setSelectedPlace({ ...match.place });
        setScreen('map');
        setMobileTab('map');
        setSearchQuery(match.place.name);

        const announceMsg = `Ditemukan: ${match.place.name}. Mengarahkan ke titik lokasi pada peta.`;
        setCustomAnnouncement(announceMsg);
        setTimeout(() => setCustomAnnouncement(null), 5000);
      } else {
        // Pencarian umum / kategori
        setScreen('map');
        setSearchQuery(clean);
        const announceMsg = `Pencarian "${clean}" diterapkan. Menampilkan hasil pada peta.`;
        setCustomAnnouncement(announceMsg);
        setTimeout(() => setCustomAnnouncement(null), 5000);
      }
    },
    [places, setScreen]
  );

  function handleSelectPlace(place: Place) {
    setSelectedPlace(place);
  }

  function handleCorrectPlace(place: Place) {
    setSelectedPlace(place);
    setScreen('report');
  }

  function handleSubmitReport(updated: Place) {
    setPlaces(current => current.map(p => p.id === updated.id ? updated : p));
    setSelectedPlace(updated);
    setReload(value => value + 1);
    setScreen('map');
  }

  const appClassName = 'app-shell';

  const hasActiveFilters =
    statusFilter !== 'all' || categoryFilter !== 'all' || searchQuery.trim().length > 0;
  const additionalFilterCount = Number(statusFilter !== 'all') + Number(categoryFilter !== 'all');

  return (
    <main className={appClassName}>
      <a href="#main-content" className="skip-link">
        Lewati ke konten utama
      </a>
      <div role="status" aria-live="polite" aria-atomic="true" className="visually-hidden">
        {liveAnnouncement}
      </div>

      <AppSidebar
        currentScreen={screen}
        onSelectScreen={setScreen}
        authReady={auth.ready}
        userProfile={auth.profile}
      />

      <section id="main-content" className="workspace">
        <TopNavbar
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onSearchSubmit={handleSearchSubmit}
          onOpenAccessibility={toggleWidget}
          accountHref={auth.user ? screenHref('profile') : loginHref(screenHref(screen))}
          authReady={auth.ready}
          userProfile={auth.profile}
          onOpenAuth={() => setShowAuthModal(true)}
        />

        {loading && <p role="status" style={{ padding: '10px 20px' }}>Memuat data tempat dari server…</p>}
        {apiError && <div role="alert" style={{ padding: '10px 20px' }}>{apiError} <button type="button" onClick={() => { setLoading(true); setReload(value => value + 1); }}>Coba lagi</button></div>}
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
                className={`map-panel ${mobileTab !== 'map' ? 'mobile-hidden' : 'mobile-active'} ${mobileFiltersOpen ? 'mobile-filters-open' : ''}`}
                aria-label="Peta interaktif aksesibilitas Surabaya"
              >
                <div className="map-toolbar">
                  <NeedFilterTabs currentNeed={need} onSelectNeed={setNeed} />

                  <div className="map-toolbar-actions">
                    <button
                      type="button"
                      className={`status-pill-btn mobile-filter-toggle ${additionalFilterCount > 0 ? 'active' : ''}`}
                      aria-expanded={mobileFiltersOpen}
                      aria-controls="category-filter-select map-status-filters"
                      onClick={() => setMobileFiltersOpen(open => !open)}
                    >
                      <Icon name="filter" size={15} />
                      <span>{mobileFiltersOpen ? 'Tutup filter' : 'Filter'}{additionalFilterCount > 0 ? ` (${additionalFilterCount})` : ''}</span>
                    </button>
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
                      className="filter-select map-category-filter"
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
                        className="status-pill-btn map-filter-reset"
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
                <div id="map-status-filters" className="status-filter-bar" role="toolbar" aria-label={`Filter kondisi untuk kebutuhan ${need}`}>
                  <span className="status-filter-label">
                    Kondisi ({need}):
                  </span>
                  <button
                    type="button"
                    data-status="all"
                    className={`status-pill-btn ${statusFilter === 'all' ? 'active' : ''}`}
                    onClick={() => setStatusFilter('all')}
                  >
                    Semua ({statusCounts.all})
                  </button>
                  <button
                    type="button"
                    data-status="UTUH"
                    className={`status-pill-btn ${statusFilter === 'UTUH' ? 'active' : ''}`}
                    onClick={() => setStatusFilter('UTUH')}
                  >
                    <Icon name="check-circle" size={13} />
                    <span>Bisa Digunakan ({statusCounts.UTUH})</span>
                  </button>
                  <button
                    type="button"
                    data-status="TERHALANG"
                    className={`status-pill-btn ${statusFilter === 'TERHALANG' ? 'active' : ''}`}
                    onClick={() => setStatusFilter('TERHALANG')}
                  >
                    <Icon name="warning" size={13} />
                    <span>Terhalang ({statusCounts.TERHALANG})</span>
                  </button>
                  <button
                    type="button"
                    data-status="TIDAK_STANDAR"
                    className={`status-pill-btn ${statusFilter === 'TIDAK_STANDAR' ? 'active' : ''}`}
                    onClick={() => setStatusFilter('TIDAK_STANDAR')}
                  >
                    <Icon name="alert-circle" size={13} />
                    <span>Perlu Perhatian ({statusCounts.TIDAK_STANDAR})</span>
                  </button>
                  <button
                    type="button"
                    data-status="TIDAK_ADA"
                    className={`status-pill-btn ${statusFilter === 'TIDAK_ADA' ? 'active' : ''}`}
                    onClick={() => setStatusFilter('TIDAK_ADA')}
                  >
                    <Icon name="x-circle" size={13} />
                    <span>Tidak Ada ({statusCounts.TIDAK_ADA})</span>
                  </button>
                  <button
                    type="button"
                    data-status="BELUM_DIKETAHUI"
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
                  onAddPlaceAtLocation={handleAddPlaceAtLocation}
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
                onWriteReview={() => {
                  if (!auth.user) {
                    setShowAuthModal(true);
                    return;
                  }
                  setScreen('review');
                }}
                signedIn={Boolean(auth.user)}
                activeNeed={need}
              />
            </div>
          </>
        )}

        {(screen === 'add' || screen === 'report') && (
          <ReportForm
            places={places}
            key={`${screen}:${selectedPlace?.id ?? 'new'}:${auth.user?.id ?? 'guest'}:${latParam ?? 'none'}:${lngParam ?? 'none'}`}
            mode={screen === 'add' ? 'add' : 'correction'}
            targetPlace={screen === 'report' ? selectedPlace ?? undefined : undefined}
            initialLocation={initialMapLocation}
            draftOwner={auth.user?.id ?? 'guest'}
            signedIn={Boolean(auth.user)}
            onRequireAuth={() => setShowAuthModal(true)}
            onCancel={() => setScreen('map')}
            onSubmitReport={handleSubmitReport}
          />
        )}

        {screen === 'review' && selectedPlace && (
          <ReviewForm
            key={String(selectedPlace.id)}
            place={selectedPlace}
            signedIn={Boolean(auth.user)}
            defaultAuthorName={auth.profile?.displayName || auth.user?.user_metadata?.full_name || ''}
            onRequireAuth={() => setShowAuthModal(true)}
            onCancel={() => setScreen('map')}
            onSubmitted={() => setScreen('map')}
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
            </div>

            <DashboardStats places={places} />
            <DataQualityCard places={places} />

            <div className="dashboard-grid">
              <StatusDistribution places={places} />
              <DistrictSnapshot places={places} />
            </div>
          </div>
        )}

        {screen === 'profile' && auth.profile && (
          <ContributorProfile userProfile={auth.profile} onSignedOut={() => setScreen('map')} />
        )}
      </section>

      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onSuccess={() => setShowAuthModal(false)}
        actionDescription={
          screen === 'add'
            ? 'menambahkan lokasi baru'
            : screen === 'report'
            ? 'melaporkan perubahan kondisi'
            : screen === 'review'
            ? 'menulis review pengalaman'
            : 'berkontribusi di Naviable'
        }
      />
    </main>
  );
}
