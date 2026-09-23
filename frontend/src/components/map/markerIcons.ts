import L from 'leaflet';

/**
 * Purple "add place" pin used for a point that is not a Naviable place yet — on the
 * Jelajahi map and in the Tambah Lokasi picker. Leaflet touches `window` on import,
 * so only import this from client-only (ssr: false) map modules.
 */
export function createTemporaryMarkerIcon() {
  const wrapper = document.createElement('div');
  wrapper.className = 'temporary-pin-wrapper';
  wrapper.innerHTML = `
    <div class="temporary-pin-pulse"></div>
    <div class="temporary-pin">
      <div class="temporary-pin-icon">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0Z"/>
          <line x1="12" y1="7" x2="12" y2="13"/>
          <line x1="9" y1="10" x2="15" y2="10"/>
        </svg>
      </div>
    </div>
  `;
  return L.divIcon({
    className: 'temporary-location-pin',
    html: wrapper,
    iconSize: [36, 36],
    iconAnchor: [18, 36],
    popupAnchor: [0, -36],
  });
}
