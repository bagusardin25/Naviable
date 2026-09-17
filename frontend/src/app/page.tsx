'use client';

import React, { useState, useMemo } from 'react';
import { Place, Screen, AccessibilityNeed, ChainElementCode, AccessibilityStatus } from '@/types';
import { SURABAYA_SEED_PLACES } from '@/data/places';
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
  const [places, setPlaces] = useState<Place[]>(SURABAYA_SEED_PLACES);
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(SURABAYA_SEED_PLACES[0]);
  const [searchQuery, setSearchQuery] = useState('');
  const [need, setNeed] = useState<AccessibilityNeed>('Mobilitas');
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

  // Filtered places according to search text
  const filteredPlaces = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return places;
    return places.filter(
      (p) =>
        p.name.toLowerCase().includes(query) ||
        p.category.toLowerCase().includes(query) ||
        p.district.toLowerCase().includes(query) ||
        (p.address && p.address.toLowerCase().includes(query))
    );
  }, [places, searchQuery]);

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
        updated: 'Baru saja',
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
