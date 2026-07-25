import { LAYERS, type LayerState } from "@/lib/floorplan/layers";
import { ACCENT, BORDER, CARD_BG, TEXT_MUTED_3 } from "@/lib/theme";

export function LayersPanel({
  layers,
  onChange,
}: {
  layers: LayerState;
  onChange: (layers: LayerState) => void;
}) {
  function toggle(id: keyof LayerState, field: "visible" | "locked") {
    onChange({
      ...layers,
      [id]: { ...layers[id], [field]: !layers[id][field] },
    });
  }

  return (
    <div
      style={{
        background: CARD_BG,
        border: `1px solid ${BORDER}`,
        borderRadius: 12,
        padding: 12,
        display: "flex",
        flexDirection: "column",
        gap: 6,
        width: 220,
        flexShrink: 0,
      }}
    >
      <div style={{ fontSize: 12, color: TEXT_MUTED_3, marginBottom: 2 }}>Camadas</div>
      {LAYERS.map((layer) => {
        const flags = layers[layer.id];
        return (
          <div
            key={layer.id}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "6px 8px",
              borderRadius: 8,
              background: "oklch(0.30 0.015 50)",
              opacity: flags.visible ? 1 : 0.5,
            }}
          >
            <div
              onClick={() => toggle(layer.id, "visible")}
              title={flags.visible ? "Ocultar camada" : "Mostrar camada"}
              style={{ cursor: "pointer", fontSize: 14, width: 18, textAlign: "center" }}
            >
              {flags.visible ? "👁" : "🚫"}
            </div>
            <div
              onClick={() => toggle(layer.id, "locked")}
              title={flags.locked ? "Destravar camada" : "Travar camada"}
              style={{
                cursor: "pointer",
                fontSize: 14,
                width: 18,
                textAlign: "center",
                color: flags.locked ? ACCENT : "inherit",
              }}
            >
              {flags.locked ? "🔒" : "🔓"}
            </div>
            <div style={{ fontSize: 12, flex: 1 }}>{layer.label}</div>
          </div>
        );
      })}
    </div>
  );
}
