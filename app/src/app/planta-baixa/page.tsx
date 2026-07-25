"use client";

import Link from "next/link";
import { useHaEntities } from "@/hooks/useHaEntities";
import { useFloorPlan } from "@/hooks/useFloorPlan";
import { FloorPlanEditor } from "@/components/floorplan/FloorPlanEditor";
import { ACCENT, BG, BORDER, FONT_FAMILY, TEXT, TEXT_MUTED_3 } from "@/lib/theme";

export default function PlantaBaixaPage() {
  const { entities } = useHaEntities();
  const { doc, setDoc, loaded, saving, savedAt, save } = useFloorPlan();

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100vh",
        width: "100%",
        background: BG,
        color: TEXT,
        fontFamily: FONT_FAMILY,
        overflow: "hidden",
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "12px 20px",
          borderBottom: `1px solid ${BORDER}`,
          flexShrink: 0,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <Link
            href="/configuracoes"
            style={{ color: TEXT_MUTED_3, textDecoration: "none", fontSize: 14 }}
          >
            ← Voltar
          </Link>
          <div style={{ fontSize: 16, fontWeight: 700 }}>Editor de planta baixa</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {savedAt && <span style={{ fontSize: 12, color: TEXT_MUTED_3 }}>Planta salva</span>}
          <div
            onClick={() => save(doc)}
            style={{
              background: ACCENT,
              color: "oklch(0.15 0.01 50)",
              fontWeight: 700,
              fontSize: 13,
              padding: "9px 18px",
              borderRadius: 8,
              cursor: saving ? "default" : "pointer",
              opacity: saving ? 0.6 : 1,
            }}
          >
            {saving ? "Salvando..." : "Salvar planta"}
          </div>
        </div>
      </div>

      <div style={{ flex: 1, minHeight: 0, padding: 16, boxSizing: "border-box" }}>
        {!loaded ? (
          <div style={{ fontSize: 13, color: TEXT_MUTED_3 }}>Carregando planta baixa...</div>
        ) : (
          <FloorPlanEditor doc={doc} onChange={setDoc} entities={entities} />
        )}
      </div>
    </div>
  );
}
