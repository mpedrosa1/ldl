"use client";

import Link from "next/link";
import { useHaEntities } from "@/hooks/useHaEntities";
import { useFloorPlan } from "@/hooks/useFloorPlan";
import { FloorPlanSvgView } from "@/components/floorplan/FloorPlanSvgView";
import { BG, BORDER, FONT_FAMILY, TEXT, TEXT_MUTED_3 } from "@/lib/theme";

/**
 * Planta baixa ocupando a viewport inteira. Fica fora do grupo `(dashboard)`
 * de propósito: sem barra lateral, o desenho aproveita a largura toda.
 * É a mesma visualização do card da Início — clicar aciona dispositivos e
 * abre a janelinha das câmeras.
 */
export default function PlantaBaixaTelaCheiaPage() {
  const { entities } = useHaEntities();
  const { doc, loaded } = useFloorPlan();

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        // `dvh` para não sobrar faixa embaixo quando a barra do navegador
        // móvel recolhe.
        height: "100dvh",
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
          gap: 16,
          // Fora do `(dashboard)`, esta página não herda o recuo do `.ldl-shell`
          // — instalada no iOS, a barra ficaria por baixo do relógio.
          padding: "calc(12px + env(safe-area-inset-top)) calc(20px + env(safe-area-inset-right)) 12px calc(20px + env(safe-area-inset-left))",
          borderBottom: `1px solid ${BORDER}`,
          flexShrink: 0,
        }}
      >
        <Link href="/" style={{ color: TEXT_MUTED_3, textDecoration: "none", fontSize: 14 }}>
          ← Voltar
        </Link>
        <div style={{ fontSize: 16, fontWeight: 700 }}>Planta baixa</div>
        <Link
          href="/planta-baixa"
          className="ldl-hide-phone"
          style={{ marginLeft: "auto", color: TEXT_MUTED_3, textDecoration: "none", fontSize: 13 }}
        >
          Editar
        </Link>
      </div>

      <div style={{ flex: 1, minHeight: 0, padding: 16, boxSizing: "border-box" }}>
        {!loaded ? (
          <div style={{ fontSize: 13, color: TEXT_MUTED_3 }}>Carregando planta baixa...</div>
        ) : (
          <FloorPlanSvgView doc={doc} entities={entities} fillContainer />
        )}
      </div>
    </div>
  );
}
