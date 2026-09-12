import AccessibilityMap from "@/components/AccessibilityMap";
import { StatusChip } from "@/components/StatusChip";
import type { ApiPlace } from "@/lib/api";
import { chainSummary, type ElementStatus, type Place } from "@/lib/types";

export const revalidate = 0; // always fresh — data comes from the backend API

async function getPlaces(): Promise<ApiPlace[]> {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  if (!apiUrl) return [];
  try {
    const res = await fetch(`${apiUrl}/api/places`, { cache: "no-store" });
    if (!res.ok) return [];
    const json = (await res.json()) as { places: ApiPlace[] };
    return json.places;
  } catch {
    // Backend down → degraded but functional UI
    return [];
  }
}

function toPlace(api: ApiPlace): Place {
  const elements: Place["elements"] = {};
  for (const [code, evidence] of Object.entries(api.elements ?? {})) {
    if (!evidence) continue;
    elements[code as keyof Place["elements"]] = {
      status: evidence.status as ElementStatus,
      lockedBy: evidence.lockedBy === "kontributor" ? "kontributor" : "ai_draf",
      photoUrl: evidence.photoUrl ?? null,
      note: evidence.note ?? null,
    };
  }
  return {
    id: api.id,
    name: api.name,
    category: api.category,
    lat: api.lat,
    lng: api.lng,
    kelurahan: api.kelurahan ?? null,
    kecamatan: api.kecamatan ?? null,
    elements,
  };
}

export default async function Home() {
  const apiPlaces = await getPlaces();
  const places = apiPlaces.map(toPlace);

  return (
    <main className="flex min-h-screen flex-col">
      <header className="border-b px-6 py-4">
        <h1 className="text-xl font-bold tracking-tight">
          AbleMap <span className="font-normal text-gray-500">— Surabaya</span>
        </h1>
        <p className="mt-1 text-sm text-gray-600">
          Di elemen mana rantai akses putus? Bukan sekadar &quot;pin hijau&quot;.
        </p>
      </header>

      <div className="grid flex-1 grid-cols-1 lg:grid-cols-[1fr_380px]">
        {/* Peta */}
        <section aria-label="Peta" className="h-[60vh] lg:h-auto">
          {places.length > 0 ? (
            <AccessibilityMap places={places} />
          ) : (
            <div className="flex h-full items-center justify-center bg-gray-50 p-8 text-center">
              <div>
                <p className="font-medium">Belum ada lokasi terpetakan.</p>
                <p className="mt-1 text-sm text-gray-500">
                  Jalankan backend (npm run dev), isi .env, lalu seed lokasi pertama.
                </p>
              </div>
            </div>
          )}
        </section>

        {/* Daftar setara — keyboard/screen-reader equivalent of the map (doc §14) */}
        <aside aria-label="Daftar lokasi" className="overflow-y-auto border-l">
          <h2 className="sticky top-0 border-b bg-white px-4 py-3 font-semibold">
            Daftar lokasi ({places.length})
          </h2>
          {places.length === 0 ? (
            <p className="px-4 py-6 text-sm text-gray-500">
              Daftar setara peta — untuk keyboard dan screen reader.
            </p>
          ) : (
            <ul className="divide-y">
              {places.map((place) => {
                const statuses = Object.values(place.elements).map((e) => e?.status);
                const status: ElementStatus = statuses.includes("TIDAK_ADA")
                  ? "TIDAK_ADA"
                  : statuses.includes("TERHALANG")
                    ? "TERHALANG"
                    : statuses.includes("TIDAK_STANDAR")
                      ? "TIDAK_STANDAR"
                      : statuses.includes("UTUH")
                        ? "UTUH"
                        : "BELUM_DIKETAHUI";
                return (
                  <li key={place.id} className="px-4 py-3">
                    <a href={`/places/${place.id}`} className="font-medium hover:underline">
                      {place.name}
                    </a>
                    <div className="mt-1 flex flex-wrap items-center gap-2">
                      <StatusChip status={status} />
                      <span className="text-xs text-gray-500">{chainSummary(place)}</span>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </aside>
      </div>
    </main>
  );
}
