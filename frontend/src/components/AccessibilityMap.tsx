"use client";

import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import { STATUS_STYLE, type ElementStatus, type Place, chainSummary } from "@/lib/types";

/** Patterned div icon — avoids Leaflet default-icon asset issues AND encodes
 *  status by shape/pattern + color + text, not color alone. */
function statusIcon(status: ElementStatus) {
  const style = STATUS_STYLE[status];
  return L.divIcon({
    className: "ablemap-pin",
    html: `<span data-pattern="${style.pattern}" style="--pin-color:${style.color}" title="${style.label}"></span>`,
    iconSize: [24, 24],
    iconAnchor: [12, 22],
    popupAnchor: [0, -20],
  });
}

/** Worst status across the 8 elements determines the pin (unknown ignored). */
export function placePinStatus(place: Place): ElementStatus {
  const statuses = Object.values(place.elements).map((e) => e?.status);
  if (statuses.includes("TIDAK_ADA")) return "TIDAK_ADA";
  if (statuses.includes("TERHALANG")) return "TERHALANG";
  if (statuses.includes("TIDAK_STANDAR")) return "TIDAK_STANDAR";
  if (statuses.includes("UTUH")) return "UTUH";
  return "BELUM_DIKETAHUI";
}

const SURABAYA_CENTER: [number, number] = [-7.2575, 112.7521];

export default function AccessibilityMap({ places }: { places: Place[] }) {
  return (
    <MapContainer
      center={SURABAYA_CENTER}
      zoom={13}
      scrollWheelZoom
      className="h-full w-full"
      aria-label="Peta aksesibilitas Surabaya"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {places.map((place) => {
        const status = placePinStatus(place);
        return (
          <Marker key={place.id} position={[place.lat, place.lng]} icon={statusIcon(status)}>
            <Popup>
              <strong>{place.name}</strong>
              <br />
              <span
                style={{
                  color: STATUS_STYLE[status].color,
                  fontWeight: 600,
                }}
              >
                {STATUS_STYLE[status].label}
              </span>
              <br />
              <small>{chainSummary(place)}</small>
            </Popup>
          </Marker>
        );
      })}
    </MapContainer>
  );
}
