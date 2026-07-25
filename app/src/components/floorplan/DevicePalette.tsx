"use client";

import { useState } from "react";
import { DEVICE_ICON_OPTIONS } from "@/lib/floorplan/icons";
import { useIconLibrary } from "@/hooks/useIconLibrary";
import { BORDER, CARD_BG, INPUT_BG, TEXT_MUTED_3 } from "@/lib/theme";

type PaletteFilter = "dispositivo" | "eletrodomestico" | "moveis";

const FILTER_OPTIONS: { key: PaletteFilter; label: string }[] = [
  { key: "dispositivo", label: "Dispositivos" },
  { key: "eletrodomestico", label: "Eletrodomésticos" },
  { key: "moveis", label: "Móveis" },
];

const selectStyle: React.CSSProperties = {
  background: INPUT_BG,
  border: `1px solid ${BORDER}`,
  borderRadius: 6,
  padding: "6px 8px",
  color: "oklch(0.94 0.006 50)",
  fontSize: 12,
  width: "100%",
  boxSizing: "border-box",
};

export function DevicePalette() {
  const { icons } = useIconLibrary();
  const [filter, setFilter] = useState<PaletteFilter>("dispositivo");

  const deviceOptions = DEVICE_ICON_OPTIONS.filter(
    (opt) => filter !== "moveis" && opt.category === filter,
  );

  return (
    <div
      style={{
        background: CARD_BG,
        border: `1px solid ${BORDER}`,
        borderRadius: 12,
        padding: 14,
        display: "flex",
        flexDirection: "column",
        gap: 8,
        width: 190,
        flexShrink: 0,
        overflowY: "auto",
      }}
    >
      <select
        style={selectStyle}
        value={filter}
        onChange={(e) => setFilter(e.target.value as PaletteFilter)}
      >
        {FILTER_OPTIONS.map((opt) => (
          <option key={opt.key} value={opt.key}>
            {opt.label}
          </option>
        ))}
      </select>

      <div style={{ fontSize: 11, color: TEXT_MUTED_3, marginTop: 2 }}>Arraste para a planta</div>

      {filter !== "moveis" &&
        deviceOptions.map((opt) => (
          <div
            key={opt.type}
            draggable
            onDragStart={(e) => {
              e.dataTransfer.setData("kind", "device");
              e.dataTransfer.setData("iconType", opt.type);
              e.dataTransfer.effectAllowed = "copy";
            }}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "8px 10px",
              borderRadius: 8,
              background: "oklch(0.30 0.015 50)",
              cursor: "grab",
              fontSize: 13,
            }}
          >
            <span style={{ fontSize: 16 }}>{opt.emoji}</span>
            {opt.label}
          </div>
        ))}

      {filter === "moveis" && (
        <>
          {icons.length === 0 && (
            <div style={{ fontSize: 11, color: TEXT_MUTED_3 }}>
              Nenhuma imagem em public/assets/icons ainda. Você pode enviar uma clicando num móvel
              depois de colocá-lo na planta.
            </div>
          )}
          {icons.map((icon) => (
            <div
              key={icon.url}
              draggable
              onDragStart={(e) => {
                e.dataTransfer.setData("kind", "furniture");
                e.dataTransfer.setData("imageUrl", icon.url);
                e.dataTransfer.setData("label", icon.name.replace(/\.[^.]+$/, ""));
                e.dataTransfer.effectAllowed = "copy";
              }}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "8px 10px",
                borderRadius: 8,
                background: "oklch(0.30 0.015 50)",
                cursor: "grab",
                fontSize: 13,
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- small palette thumbnail */}
              <img src={icon.url} alt="" style={{ width: 20, height: 20, objectFit: "contain" }} />
              <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {icon.name.replace(/\.[^.]+$/, "")}
              </span>
            </div>
          ))}
          <div
            draggable
            onDragStart={(e) => {
              e.dataTransfer.setData("kind", "furniture");
              e.dataTransfer.setData("label", "Móvel");
              e.dataTransfer.effectAllowed = "copy";
            }}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "8px 10px",
              borderRadius: 8,
              background: "oklch(0.30 0.015 50)",
              cursor: "grab",
              fontSize: 13,
              border: `1px dashed ${BORDER}`,
            }}
          >
            <span style={{ fontSize: 16 }}>⬛</span>
            Móvel em branco
          </div>
        </>
      )}
    </div>
  );
}
