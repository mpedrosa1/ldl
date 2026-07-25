"use client";

import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { useHaEntities } from "@/hooks/useHaEntities";
import { getPersonLocations, getZoneMarkers } from "@/lib/ha/geo";
import { ResidentCard } from "@/components/ResidentCard";
import { FilterChips } from "@/components/FilterChips";
import { BORDER, TEXT_MUTED_2 } from "@/lib/theme";

const MapView = dynamic(() => import("@/components/MapView").then((m) => m.MapView), {
  ssr: false,
});

const FILTER_OPTIONS = [
  { key: "todos", label: "Todos" },
  { key: "home", label: "Em casa" },
  { key: "fora", label: "Fora" },
];

export default function MapaPage() {
  const { entities } = useHaEntities();
  const [filter, setFilter] = useState("todos");

  const persons = useMemo(() => getPersonLocations(entities), [entities]);
  const zones = useMemo(() => getZoneMarkers(entities), [entities]);

  const filtered = persons.filter((p) => {
    if (filter === "todos") return true;
    if (filter === "home") return p.isHome;
    return !p.isHome;
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 20,
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        <div style={{ fontSize: 26, fontWeight: 700 }}>Mapa</div>
        <FilterChips options={FILTER_OPTIONS} active={filter} onChange={setFilter} />
      </div>

      <div
        style={{
          position: "relative",
          borderRadius: 16,
          overflow: "hidden",
          border: `1px solid ${BORDER}`,
          height: "calc(100vh - 220px)",
          minHeight: 480,
        }}
      >
        {persons.length === 0 ? (
          <div
            style={{
              width: "100%",
              height: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 13,
              color: TEXT_MUTED_2,
            }}
          >
            Nenhuma pessoa com localização GPS disponível ainda.
          </div>
        ) : (
          <>
            <MapView persons={filtered} zones={zones} />

            <div
              style={{
                position: "absolute",
                top: 16,
                right: 16,
                zIndex: 1000,
                width: 230,
                maxHeight: "calc(100% - 32px)",
                overflowY: "auto",
                background: "oklch(0.19 0.012 50 / 0.78)",
                backdropFilter: "blur(10px)",
                WebkitBackdropFilter: "blur(10px)",
                border: `1px solid ${BORDER}`,
                borderRadius: 14,
                padding: 14,
                display: "flex",
                flexDirection: "column",
                gap: 14,
              }}
            >
              {filtered.length === 0 ? (
                <div style={{ fontSize: 12, color: TEXT_MUTED_2 }}>
                  Ninguém nesse filtro.
                </div>
              ) : (
                filtered.map((p) => <ResidentCard key={p.entityId} person={p} />)
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
