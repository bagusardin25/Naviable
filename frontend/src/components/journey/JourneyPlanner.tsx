'use client';

import React, { useState } from 'react';
import { Place, AccessibilityNeed, JourneyResponse, CHAIN_ELEMENT_MAP, ChainElementCode } from '@/types';
import { fetchJourney } from '@/lib/api';
import { Icon } from '@/components/ui/Icon';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { buildGoogleMapsRouteUrl, buildGoogleMapsPlaceUrl, TravelMode } from '@/lib/externalMaps';
import { useTranslation } from '@/hooks/useTranslation';

type JourneyPlannerProps = {
  places: Place[];
  currentNeed: AccessibilityNeed;
  onSelectPlace: (place: Place) => void;
  onClose: () => void;
};

export function JourneyPlanner({
  places,
  currentNeed,
  onSelectPlace,
  onClose,
}: JourneyPlannerProps) {
  const { t } = useTranslation();
  // Only places with coordinates are eligible for journey origin/destination
  const geocodedPlaces = places.filter((p) => !p.needsGeocoding && p.lat !== null && p.lng !== null);

  const [originId, setOriginId] = useState<string>(geocodedPlaces[0] ? String(geocodedPlaces[0].id) : '');
  const [destinationId, setDestinationId] = useState<string>(
    geocodedPlaces[1] ? String(geocodedPlaces[1].id) : ''
  );
  const [profile, setProfile] = useState<AccessibilityNeed>(currentNeed);
  const [travelMode, setTravelMode] = useState<TravelMode>('walking');
  const [loading, setLoading] = useState(false);
  const [journey, setJourney] = useState<JourneyResponse | null>(null);
  const [error, setError] = useState('');

  async function handleSearch(e?: React.FormEvent) {
    if (e) e.preventDefault();
    if (!originId || !destinationId) {
      setError(t('journey.selectBothPrompt'));
      return;
    }
    if (originId === destinationId) {
      setError(t('journey.originMustDiffer'));
      return;
    }

    setLoading(true);
    setError('');
    try {
      const res = await fetchJourney(originId, destinationId, profile.toLowerCase());
      setJourney(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('common.error'));
    } finally {
      setLoading(false);
    }
  }

  function getElementLabel(elementKey: string): string {
    const code = elementKey.split('_')[0] as ChainElementCode;
    if (code && CHAIN_ELEMENT_MAP[code]) {
      return t(`elements.${code}.name`) || CHAIN_ELEMENT_MAP[code].label;
    }
    return elementKey;
  }

  return (
    <div className="journey-planner-panel" role="region" aria-label={t('journey.panelAria')}>
      <div className="journey-planner-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Icon name="route" />
          <h2 style={{ fontSize: '15px', fontWeight: 800, margin: 0, color: '#1e293b' }}>
            {t('journey.title')}
          </h2>
        </div>
        <button
          type="button"
          className="drawer-close"
          onClick={onClose}
          aria-label={t('journey.closeAria')}
          style={{ position: 'static' }}
        >
          <Icon name="close" />
        </button>
      </div>

      <div
        className="journey-disclaimer-card"
        role="note"
        style={{
          background: 'var(--notice-warning-bg)',
          border: '1px solid var(--notice-warning-border)',
          padding: '10px 12px',
          borderRadius: '8px',
          fontSize: '11px',
          color: 'var(--notice-warning-ink)',
          margin: '10px 0',
          lineHeight: 1.45,
        }}
      >
        <strong>{t('journey.disclaimerNote')}</strong> {t('journey.disclaimerBold')}
      </div>

      <form onSubmit={handleSearch} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <div>
          <label
            htmlFor="journey-origin-select"
            style={{ fontSize: '11px', fontWeight: 700, color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '4px' }}
          >
            <Icon name="location" size={13} />
            <span>{t('journey.originLabel')}</span>
          </label>
          <select
            id="journey-origin-select"
            className="filter-select"
            style={{ width: '100%' }}
            value={originId}
            onChange={(e) => setOriginId(e.target.value)}
          >
            <option value="" disabled>{t('journey.originPlaceholder')}</option>
            {geocodedPlaces.map((p) => (
              <option key={p.id} value={String(p.id)}>
                {p.name} ({p.district})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label
            htmlFor="journey-dest-select"
            style={{ fontSize: '11px', fontWeight: 700, color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '4px' }}
          >
            <Icon name="compass" size={13} />
            <span>{t('journey.destLabel')}</span>
          </label>
          <select
            id="journey-dest-select"
            className="filter-select"
            style={{ width: '100%' }}
            value={destinationId}
            onChange={(e) => setDestinationId(e.target.value)}
          >
            <option value="" disabled>{t('journey.destPlaceholder')}</option>
            {geocodedPlaces.map((p) => (
              <option key={p.id} value={String(p.id)}>
                {p.name} ({p.district})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label
            htmlFor="journey-profile-select"
            style={{ fontSize: '11px', fontWeight: 700, color: 'var(--muted)', display: 'block', marginBottom: '4px' }}
          >
            {t('journey.profileLabel')}
          </label>
          <select
            id="journey-profile-select"
            className="filter-select"
            style={{ width: '100%' }}
            value={profile}
            onChange={(e) => setProfile(e.target.value as AccessibilityNeed)}
          >
            <option value="Mobilitas">{t('needs.Mobilitas')}</option>
            <option value="Visual">{t('needs.Visual')}</option>
            <option value="Auditori">{t('needs.Auditori')}</option>
            <option value="Sensorik">{t('needs.Sensorik')}</option>
          </select>
        </div>

        <button
          type="submit"
          className="primary-action"
          style={{ marginTop: '6px', justifyContent: 'center' }}
          disabled={loading || !originId || !destinationId}
        >
          {loading ? t('journey.calculatingRoute') : t('journey.searchRouteBtn')}
        </button>

        {error && (
          <div role="alert" style={{ color: 'var(--notice-error-ink)', fontSize: '11px', background: 'var(--notice-error-bg)', border: '1px solid var(--notice-error-border)', padding: '8px 10px', borderRadius: '6px' }}>
            {error}
          </div>
        )}
      </form>

      {journey && (
        <div className="journey-results" style={{ marginTop: '16px' }}>
          <div
            style={{
              padding: '10px 12px',
              borderRadius: '8px',
              background: journey.hasBottlenecks ? 'var(--notice-error-bg)' : 'var(--notice-success-bg)',
              border: `1px solid ${journey.hasBottlenecks ? 'var(--notice-error-border)' : 'var(--notice-success-border)'}`,
              marginBottom: '12px',
            }}
          >
            <strong style={{ fontSize: '12px', color: journey.hasBottlenecks ? 'var(--notice-error-ink)' : 'var(--notice-success-ink)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              {journey.hasBottlenecks ? (
                <>
                  <Icon name="warning" size={15} />
                  <span>{t('journey.bottlenecksAlert', { count: journey.bottleneckCount })}</span>
                </>
              ) : (
                <>
                  <Icon name="check-circle" size={15} />
                  <span>{t('journey.allPointsUsable')}</span>
                </>
              )}
            </strong>
            <span style={{ fontSize: '11px', color: journey.hasBottlenecks ? 'var(--notice-error-ink)' : 'var(--notice-success-ink)', display: 'block', marginTop: '2px', opacity: 0.9 }}>
              {t('journey.checkedForNeed', { need: t(`needs.${profile}`) || profile })}
            </span>
          </div>

          {(() => {
            const originPoint = journey.points[0];
            const destPoint = journey.points[journey.points.length - 1];
            const waypoints = journey.points.slice(1, -1);
            const googleMapsRouteUrl =
              originPoint && destPoint
                ? buildGoogleMapsRouteUrl({
                    origin: originPoint,
                    destination: destPoint,
                    waypoints,
                    travelMode,
                  })
                : null;

            const transitInfo = waypoints.length > 0 ? t('journey.transitPointsSuffix', { count: waypoints.length }) : '';

            return googleMapsRouteUrl ? (
              <div className="google-maps-card" role="region" aria-label={t('journey.directNavigationTitle')}>
                <div className="google-maps-card-header">
                  <span className="google-maps-card-title">
                    <Icon name="navigation" size={15} />
                    <span>{t('journey.directNavigationTitle')}</span>
                  </span>
                  <div className="google-maps-mode-pills" role="group" aria-label={t('journey.travelModeAria')}>
                    <button
                      type="button"
                      className={`google-maps-mode-btn ${travelMode === 'walking' ? 'active' : ''}`}
                      onClick={() => setTravelMode('walking')}
                      aria-pressed={travelMode === 'walking'}
                    >
                      {t('journey.walkingMode')}
                    </button>
                    <button
                      type="button"
                      className={`google-maps-mode-btn ${travelMode === 'transit' ? 'active' : ''}`}
                      onClick={() => setTravelMode('transit')}
                      aria-pressed={travelMode === 'transit'}
                    >
                      {t('journey.transitMode')}
                    </button>
                  </div>
                </div>
                <p style={{ margin: 0, fontSize: '11.5px', color: 'var(--muted)', lineHeight: 1.45 }}>
                  {t('journey.turnByTurnDesc', {
                    origin: originPoint?.name,
                    destination: destPoint?.name,
                    transitInfo,
                  })}
                </p>
                <a
                  href={googleMapsRouteUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="google-maps-btn"
                  aria-label={t('journey.openInGoogleMapsAria', {
                    origin: originPoint?.name,
                    destination: destPoint?.name,
                  })}
                >
                  <Icon name="navigation" size={14} />
                  <span>{t('journey.openInGoogleMaps')}</span>
                  <Icon name="external-link" size={13} />
                </a>
              </div>
            ) : null;
          })()}

          <ol className="journey-points-list" style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {journey.points.map((pt, idx) => {
              const fullPlace = places.find((p) => String(p.id) === String(pt.id));
              const isOrigin = idx === 0;
              const isDestination = idx === journey.points.length - 1;
              const stepLabel = isOrigin
                ? t('journey.stepOrigin', { num: 1 })
                : isDestination
                ? t('journey.stepDest', { num: journey.points.length })
                : t('journey.stepTransit', { num: idx + 1 });
              const pointNavUrl =
                pt.lat !== null && pt.lng !== null
                  ? buildGoogleMapsPlaceUrl({ destination: pt, travelMode })
                  : null;

              return (
                <li
                  key={pt.id}
                  style={{
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                    padding: '10px',
                    marginBottom: '8px',
                    background: 'var(--surface-secondary)',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                    <div>
                      <span style={{ fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', color: 'var(--purple)' }}>
                        {stepLabel}
                      </span>
                      <strong style={{ fontSize: '13px', display: 'block', color: 'var(--ink)' }}>
                        {pt.name}
                      </strong>
                      <span style={{ fontSize: '11px', color: 'var(--muted)' }}>
                        {pt.category} · {pt.kecamatan ?? 'Surabaya'}
                      </span>
                    </div>
                    <StatusBadge status={pt.overall} size="sm" />
                  </div>

                  {pt.bottlenecks && pt.bottlenecks.length > 0 && (
                    <div style={{ margin: '6px 0', fontSize: '11px', color: 'var(--notice-error-ink)', background: 'var(--notice-error-bg)', border: '1px solid var(--notice-error-border)', padding: '4px 8px', borderRadius: '4px' }}>
                      <strong>{t('journey.problematicAccess')}</strong>{' '}
                      {pt.bottlenecks.map(getElementLabel).join(', ')}
                    </div>
                  )}

                  <p style={{ margin: '6px 0 8px', fontSize: '11px', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                    {pt.summary}
                  </p>

                  <div style={{ display: 'flex', gap: '6px', marginTop: '8px', flexWrap: 'wrap' }}>
                    {fullPlace && (
                      <button
                        type="button"
                        className="secondary-action"
                        style={{ fontSize: '11px', padding: '6px 10px', flex: '1 1 auto', justifyContent: 'center' }}
                        onClick={() => onSelectPlace(fullPlace)}
                      >
                        {t('journey.viewPlaceDetails')}
                      </button>
                    )}
                    {pointNavUrl && (
                      <a
                        href={pointNavUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="google-maps-btn-secondary"
                        style={{ fontSize: '11px', padding: '6px 10px', flex: '1 1 auto', justifyContent: 'center' }}
                        aria-label={t('journey.navigateHereAria', { name: pt.name })}
                      >
                        <Icon name="navigation" size={12} />
                        <span>{t('journey.navigateHere')}</span>
                        <Icon name="external-link" size={11} />
                      </a>
                    )}
                  </div>
                </li>
              );
            })}
          </ol>
        </div>
      )}
    </div>
  );
}
