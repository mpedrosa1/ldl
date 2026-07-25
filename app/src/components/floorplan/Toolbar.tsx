import type { EditMode } from "./FloorPlanCanvas";
import { ACCENT, BORDER } from "@/lib/theme";

const MODES: { key: EditMode; label: string }[] = [
  { key: "select", label: "Selecionar" },
  { key: "floor", label: "Piso" },
  { key: "wall", label: "Parede" },
  { key: "door", label: "Porta" },
  { key: "window", label: "Janela" },
];

export function Toolbar({ mode, onChange }: { mode: EditMode; onChange: (m: EditMode) => void }) {
  return (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
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
    </div>
  );
}
