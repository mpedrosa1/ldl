"use client";

import { Suspense, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useHaEntities } from "@/hooks/useHaEntities";
import { useHaAreas } from "@/hooks/useHaAreas";
import { useTapoCameras } from "@/hooks/useTapoCameras";
import { useCustomDevices } from "@/hooks/useCustomDevices";
import { isVisibleDevice, friendlyName } from "@/lib/ha/devices";
import { visibleHaCameraIds } from "@/lib/cameras/list";
import { CameraTile } from "@/components/CameraTile";
import { TapoCameraTile } from "@/components/TapoCameraTile";
import { FilterChips } from "@/components/FilterChips";
import { TapoVideoPlayer } from "@/components/TapoVideoPlayer";

interface UnifiedCamera {
  key: string;
  name: string;
  snapshotUrl: string;
  streamUrl: string;
  areaId?: string;
  source: "ha" | "tapo";
  tapoId?: string;
}

/** `useSearchParams` força renderização no cliente até o Suspense mais próximo;
 * o boundary mantém o resto da rota prerenderizada. */
export default function CamerasPage() {
  return (
    <Suspense fallback={null}>
      <CamerasView />
    </Suspense>
  );
}

function CamerasView() {
  const searchParams = useSearchParams();
  const { entities } = useHaEntities();
  const { areas, entityArea, entityMeta } = useHaAreas();
  const { cameras: tapoCameras } = useTapoCameras();
  const { devices: customDevices } = useCustomDevices();
  const [filter, setFilter] = useState("todos");
  // Já abre a câmera pedida na URL — é assim que um ícone de câmera da planta
  // baixa leva direto para a câmera dele, e não só para a lista.
  const [expandedKey, setExpandedKey] = useState<string | null>(() => searchParams.get("camera"));

  // Câmeras do HA só aparecem aqui se foram marcadas como "Mostrar em Câmeras"
  // ao serem adicionadas a um dispositivo em Configurações — não existe mais
  // uma tela separada de "entidades habilitadas". A regra mora em
  // `visibleHaCameraIds` para o editor de planta baixa oferecer exatamente as
  // mesmas câmeras que esta página mostra.
  const visibleCameraEntityIds = useMemo(() => visibleHaCameraIds(customDevices), [customDevices]);

  const haCameras = useMemo(
    () =>
      entities.filter(
        (e) => visibleCameraEntityIds.has(e.entity_id) && isVisibleDevice(e, entityMeta[e.entity_id]),
      ),
    [entities, entityMeta, visibleCameraEntityIds],
  );

  const cameras: UnifiedCamera[] = useMemo(
    () => [
      ...haCameras.map((e) => ({
        key: `ha:${e.entity_id}`,
        name: friendlyName(e),
        snapshotUrl: `/api/ha/camera/${e.entity_id}/snapshot`,
        streamUrl: `/api/ha/camera/${e.entity_id}/stream`,
        areaId: entityArea[e.entity_id] ?? undefined,
        source: "ha" as const,
      })),
      ...tapoCameras.map((c) => ({
        key: `tapo:${c.id}`,
        name: c.name,
        snapshotUrl: `/api/tapo-cameras/${c.id}/snapshot`,
        streamUrl: `/api/tapo-cameras/${c.id}/stream`,
        source: "tapo" as const,
        tapoId: c.id,
      })),
    ],
    [haCameras, entityArea, tapoCameras],
  );

  const filterOptions = useMemo(() => {
    const areaName = new Map(areas.map((a) => [a.area_id, a.name]));
    const areaIdsWithCamera = new Set(
      cameras.map((c) => c.areaId).filter(Boolean) as string[],
    );
    const options = [
      { key: "todos", label: "Todas" },
      ...[...areaIdsWithCamera].map((id) => ({ key: id, label: areaName.get(id) ?? id })),
    ];
    if (tapoCameras.length > 0) options.push({ key: "tapo", label: "Tapo" });
    return options;
  }, [cameras, areas, tapoCameras]);

  const filtered = cameras.filter((c) => {
    if (filter === "todos") return true;
    if (filter === "tapo") return c.source === "tapo";
    return c.areaId === filter;
  });

  const expanded = cameras.find((c) => c.key === expandedKey);

  return (
    <div>
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
        <div style={{ fontSize: 26, fontWeight: 700 }}>Câmeras</div>
        <FilterChips options={filterOptions} active={filter} onChange={setFilter} />
      </div>

      {filtered.length === 0 && (
        <div style={{ fontSize: 14, color: "oklch(0.65 0.01 50)" }}>
          Nenhuma câmera encontrada. Adicione uma do Home Assistant ou uma câmera Tapo em
          Configurações.
        </div>
      )}

      <div className="ldl-grid-2" style={{ gridTemplateColumns: "1fr 1fr" }}>
        {filtered.map((cam) =>
          cam.source === "tapo" && cam.tapoId ? (
            <TapoCameraTile
              key={cam.key}
              cameraId={cam.tapoId}
              name={cam.name}
              snapshotUrl={cam.snapshotUrl}
              onClick={() => setExpandedKey(cam.key)}
            />
          ) : (
            <CameraTile
              key={cam.key}
              name={cam.name}
              snapshotUrl={cam.snapshotUrl}
              onClick={() => setExpandedKey(cam.key)}
            />
          ),
        )}
      </div>

      {expanded && (
        <div
          onClick={() => setExpandedKey(null)}
          style={{
            position: "fixed",
            inset: 0,
            background: "oklch(0.1 0.01 50 / 0.85)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 50,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "min(900px, 90vw)",
              aspectRatio: "16/9",
              position: "relative",
              borderRadius: 16,
              overflow: "hidden",
              border: "1px solid oklch(0.36 0.016 50)",
            }}
          >
            {expanded.source === "tapo" ? (
              <TapoVideoPlayer src={expanded.streamUrl} />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element -- MJPEG multipart stream, not an optimizable static asset
              <img
                src={expanded.streamUrl}
                alt={expanded.name}
                // Mesmo motivo do player Tapo: cortar para preencher comeria a
                // data e o nome que a câmera desenha nas bordas do quadro.
                style={{ width: "100%", height: "100%", objectFit: "contain", background: "black" }}
              />
            )}
            <div
              style={{
                position: "absolute",
                top: 14,
                left: 14,
                fontSize: 14,
                fontWeight: 700,
                color: "oklch(0.97 0 0)",
                textShadow: "0 1px 4px oklch(0 0 0 / 0.6)",
                pointerEvents: "none",
              }}
            >
              {expanded.name}
            </div>
            <div
              onClick={() => setExpandedKey(null)}
              style={{
                position: "absolute",
                top: 14,
                right: 14,
                fontSize: 13,
                color: "oklch(0.97 0 0)",
                cursor: "pointer",
                background: "oklch(0.15 0.01 50 / 0.6)",
                padding: "6px 12px",
                borderRadius: 999,
              }}
            >
              Fechar
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
