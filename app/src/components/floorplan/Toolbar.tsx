import type { EditMode } from "./FloorPlanCanvas";
import { ACCENT, BORDER } from "@/lib/theme";

const MODES: { key: EditMode; label: string }[] = [
  { key: "select", label: "Selecionar" },
  { key: "floor", label: "Piso" },
  { key: "wall", label: "Parede" },
  { key: "door", label: "Porta" },
  { key: "window", label: "Janela" },
];

/** Girar é ação, não modo de edição — daí o visual diferente dos botões acima. */
function RotateButton({
  label,
  title,
  onClick,
}: {
  label: string;
  title: string;
  onClick: () => void;
}) {
  return (
    <div
      className="ldl-chip"
      onClick={onClick}
      title={title}
      style={{
        padding: "7px 12px",
        borderRadius: 999,
        fontSize: 13,
        cursor: "pointer",
        border: `1px solid ${BORDER}`,
        color: "oklch(0.75 0.006 50)",
        fontWeight: 600,
        whiteSpace: "nowrap",
      }}
    >
      {label}
    </div>
  );
}

export function Toolbar({
  mode,
  onChange,
  onRotateAll,
}: {
  mode: EditMode;
  onChange: (m: EditMode) => void;
  onRotateAll: (degrees: number) => void;
}) {
  return (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
      {MODES.map((m) => {
        const active = mode === m.key;
        return (
          <div
            key={m.key}
            onClick={() => onChange(m.key)}
            style={{
              padding: "7px 14px",
              borderRadius: 999,
              fontSize: 13,
              cursor: "pointer",
              background: active ? ACCENT : "oklch(0.30 0.015 50)",
              color: active ? "oklch(0.15 0.01 50)" : "oklch(0.75 0.006 50)",
              border: `1px solid ${BORDER}`,
              fontWeight: 600,
            }}
          >
            {m.label}
          </div>
        );
      })}

      <div style={{ width: 1, alignSelf: "stretch", background: BORDER, margin: "0 4px" }} />
      <RotateButton
        label="⟲ 90°"
        title="Girar a planta inteira 90° à esquerda"
        onClick={() => onRotateAll(-90)}
      />
      <RotateButton
        label="⟳ 90°"
        title="Girar a planta inteira 90° à direita"
        onClick={() => onRotateAll(90)}
      />
    </div>
  );
}
