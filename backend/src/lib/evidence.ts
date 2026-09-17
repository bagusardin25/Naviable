import {
  CHAIN_ELEMENTS,
  ELEMENT_STATUSES,
  PROFILE_WEIGHTS,
  summarizePlace,
  type Place,
  type UserProfile,
  type ChainElement,
  type ElementStatus,
} from "./types.js";

export function observatory(places: Place[]) {
  const summarize = (group: Place[]) => ({
    places: group.length,
    geocoded: group.filter(p => !p.needsGeocoding && p.lat !== null && p.lng !== null).length,
    reportedPlaces: group.filter(p => p.reportCount > 0).length,
    reports: group.reduce((sum, p) => sum + p.reportCount, 0),
    photos: group.reduce((sum, p) => sum + p.photoCount, 0),
    brokenPlaces: group.filter(p => ["TERHALANG", "TIDAK_STANDAR", "TIDAK_ADA"].includes(summarizePlace(p).overall)).length,
    elements: Object.fromEntries(CHAIN_ELEMENTS.map(el => [el, Object.fromEntries(ELEMENT_STATUSES.map(status => [status,
      group.filter(p => (p.elements[el]?.status ?? "BELUM_DIKETAHUI") === status).length]))])),
  });
  const districts = [...new Set(places.map(p => p.kecamatan ?? "Belum diketahui"))].sort();
  return { ...summarize(places), districts: districts.map(name => ({ name, ...summarize(places.filter(p => (p.kecamatan ?? "Belum diketahui") === name)) })), disclaimer: "Pra-survei bukan verifikasi lapangan. Status berasal dari konfirmasi kontributor, bukan penilaian hukum." };
}
export function csvCell(value: unknown) {
  let text = String(value ?? "");
  if (/^[\s]*[=+\-@\t\r\n]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
}

export type CsvFilters = {
  profile?: UserProfile;
  element?: ChainElement;
  status?: ElementStatus;
};

export function evidenceCsv(places: Place[], publicUrl: string, filters: CsvFilters = {}) {
  const rows: unknown[][] = [["ID", "Nama", "Kategori", "Kecamatan", "Latitude", "Longitude", "Perlu_Geocoding", "Tingkat_Bukti_Awal", "Sumber_dan_Lisensi", "Pra_Survei", "Kode_Elemen", "Status", "Dikonfirmasi_Oleh", "Foto_Bukti", "Catatan", "Diperbarui", "Keterbatasan"]];
  const relevantElements = filters.element
    ? [filters.element]
    : filters.profile
    ? (Object.keys(PROFILE_WEIGHTS[filters.profile] ?? {}) as ChainElement[])
    : CHAIN_ELEMENTS;

  for (const p of places) {
    for (const code of relevantElements) {
      const e = p.elements[code];
      const status = e?.status ?? "BELUM_DIKETAHUI";
      if (filters.status && status !== filters.status) continue;
      rows.push([
        p.id, p.name, p.category, p.kecamatan, p.lat, p.lng, p.needsGeocoding, p.evidenceLevel,
        JSON.stringify(p.sources), JSON.stringify(p.preSurvey), code, status, e?.lockedBy ?? "pra_survei",
        e?.photoUrl ? `${publicUrl}${e.photoUrl}` : "", e?.note ?? "", p.updatedAt,
        "Pra-survei bukan verifikasi lapangan; status kontributor bukan penilaian hukum."
      ]);
    }
  }
  return "\uFEFF" + rows.map(row => row.map(csvCell).join(",")).join("\r\n");
}

function distance(a: Place, b: Place) {
  const rad = Math.PI / 180;
  const dLat = (b.lat! - a.lat!) * rad, dLng = (b.lng! - a.lng!) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat! * rad) * Math.cos(b.lat! * rad) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(Math.min(1, h)));
}

export function journeyHint(places: Place[], from: Place, to: Place, profile: UserProfile) {
  const stops = places.filter(p => p.category === "bus_stop" && p.id !== from.id && p.id !== to.id && !p.needsGeocoding && p.lat !== null && p.lng !== null);
  const stop = stops.sort((a, b) => distance(from, a) + distance(a, to) - distance(from, b) - distance(b, to))[0];
  const points = [from, ...(stop ? [stop] : []), to].map(p => summarizePlace(p, profile));
  const bottleneckPlaces = points.filter(p => ["TERHALANG", "TIDAK_STANDAR", "TIDAK_ADA"].includes(p.overall));
  return {
    points,
    profile,
    hasBottlenecks: bottleneckPlaces.length > 0,
    bottleneckCount: bottleneckPlaces.length,
    geometry: null,
    routing: false,
    disclaimer: "Urutan titik untuk diperiksa, bukan rute aman atau navigasi jalan. Halte dipilih berdasarkan jarak garis lurus; konektivitas trotoar, layanan bus, dan ruas antar titik belum diverifikasi."
  };
}
