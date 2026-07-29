"use client";

import Link from "next/link";
import { useDevicesByArea } from "@/hooks/useDevicesByArea";
import { useHaEntities } from "@/hooks/useHaEntities";
import { useFloorPlan } from "@/hooks/useFloorPlan";
import { useClock, greetingFor, dateLabelFor } from "@/hooks/useClock";
import { useLogbook } from "@/hooks/useLogbook";
import { FloorPlanSvgView } from "@/components/floorplan/FloorPlanSvgView";
import { EnergyPanel } from "@/components/EnergyPanel";
import { ActivityLog } from "@/components/ActivityLog";
import { ConnectionBadge } from "@/components/ConnectionBadge";
import { ACCENT, CARD_BG, TEXT_MUTED_2 } from "@/lib/theme";

export default function InicioPage() {
  const { status, allDevices } = useDevicesByArea();
  const { entities } = useHaEntities();
  const { doc, loaded } = useFloorPlan();
  const now = useClock();
  const logEntries = useLogbook();

  const activeCount = allDevices.filter(
    (d) => (d.config.kind === "toggle" || d.config.kind === "media") && d.isOn,
  ).length;

  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: 24,
          gap: 16,
          flexWrap: "wrap",
        }}
      >
        <div>
          <div style={{ fontSize: 26, fontWeight: 700 }}>
            {now ? greetingFor(now) : "Olá"}
          </div>
          <div
            style={{
              fontSize: 14,
              color: TEXT_MUTED_2,
              textTransform: "capitalize",
              marginTop: 4,
            }}
          >
            {now ? dateLabelFor(now) : ""}
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <ConnectionBadge status={status} />
          <div
            style={{
              background: CARD_BG,
              border: "1px solid oklch(0.36 0.016 50)",
              borderRadius: 999,
              padding: "8px 16px",
              fontSize: 13,
              color: "oklch(0.85 0.006 50)",
              whiteSpace: "nowrap",
            }}
          >
            {activeCount} dispositivos ativos
          </div>
        </div>
      </div>

      <div
        style={{
          background: CARD_BG,
          border: "1px solid oklch(0.36 0.016 50)",
          borderRadius: 16,
          padding: 20,
          marginBottom: 24,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            marginBottom: 16,
          }}
        >
          <div style={{ fontSize: 16, fontWeight: 600 }}>Planta baixa</div>
          <Link
            href="/planta-baixa/tela-cheia"
            style={{ fontSize: 12, color: ACCENT, textDecoration: "none" }}
          >
            Abrir em tela cheia
          </Link>
        </div>
        {!loaded ? (
          <div style={{ fontSize: 13, color: TEXT_MUTED_2 }}>Carregando planta baixa...</div>
        ) : doc.walls.length === 0 &&
          doc.devices.length === 0 &&
          doc.furniture.length === 0 &&
          doc.floors.length === 0 ? (
          <div style={{ fontSize: 14, color: TEXT_MUTED_2 }}>
            Você ainda não desenhou sua planta baixa. Vá em Configurações para desenhar paredes,
            portas, janelas e posicionar os dispositivos.
          </div>
        ) : (
          <FloorPlanSvgView doc={doc} entities={entities} />
        )}
      </div>

      <div className="ldl-grid-2" style={{ gridTemplateColumns: "1.3fr 1fr" }}>
        <EnergyPanel entities={entities} />
        <ActivityLog entries={logEntries} />
      </div>
    </div>
  );
}
