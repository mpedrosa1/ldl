"use client";

import { useMemo } from "react";
import { MapContainer, TileLayer, Marker, Circle, Popup } from "react-leaflet";
import L from "leaflet";
import type { PersonLocation, ZoneMarker } from "@/lib/ha/geo";
import { initialsOf } from "@/lib/ha/devices";
import { ACCENT2, SUCCESS } from "@/lib/theme";

function personIcon(person: PersonLocation): L.DivIcon {
  const color = person.isHome ? SUCCESS : ACCENT2;
  return L.divIcon({
    className: "",
    html: `<div style="
      width:36px;height:36px;border-radius:50%;
      background:oklch(0.28 0.014 50);border:2px solid ${color};
      display:flex;align-items:center;justify-content:center;
      font-size:12px;font-weight:700;color:oklch(0.94 0.006 50);
      font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;
      box-shadow:0 2px 6px rgba(0,0,0,0.4);
    ">${initialsOf(person.name)}</div>`,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
  });
}

export function MapView({
  persons,
  zones,
}: {
  persons: PersonLocation[];
  zones: ZoneMarker[];
}) {
  const center = useMemo<[number, number]>(() => {
    const home = zones.find((z) => z.entityId === "zone.home");
    if (home) return [home.lat, home.lon];
    if (persons.length > 0) return [persons[0].lat, persons[0].lon];
    return [0, 0];
  }, [zones, persons]);

  return (
    <MapContainer
      center={center}
      zoom={15}
      style={{ width: "100%", height: "100%" }}
      scrollWheelZoom
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {zones.map((zone) => (
        <Circle
          key={zone.entityId}
          center={[zone.lat, zone.lon]}
          radius={zone.radius}
          pathOptions={{
            color: zone.entityId === "zone.home" ? SUCCESS : ACCENT2,
            fillOpacity: 0.1,
            weight: 1,
          }}
        >
          <Popup>{zone.name}</Popup>
        </Circle>
      ))}

      {persons.map((person) => (
        <Marker key={person.entityId} position={[person.lat, person.lon]} icon={personIcon(person)}>
          <Popup>
            <strong>{person.name}</strong>
            <br />
            {person.isHome ? "Em casa" : person.state}
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
