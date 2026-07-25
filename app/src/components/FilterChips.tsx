import { ACCENT, BORDER } from "@/lib/theme";

export interface FilterOption {
  key: string;
  label: string;
}

export function FilterChips({
  options,
  active,
  onChange,
}: {
  options: FilterOption[];
  active: string;
  onChange: (key: string) => void;
}) {
  return (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
      {options.map((opt) => {
        const isActive = active === opt.key;
        return (
          <div
            key={opt.key}
            onClick={() => onChange(opt.key)}
            style={{
              padding: "7px 14px",
              borderRadius: 999,
              fontSize: 13,
              cursor: "pointer",
              background: isActive ? ACCENT : "oklch(0.30 0.015 50)",
              color: isActive ? "oklch(0.15 0.01 50)" : "oklch(0.75 0.006 50)",
              border: `1px solid ${BORDER}`,
              fontWeight: 600,
            }}
          >
            {opt.label}
          </div>
        );
      })}
    </div>
  );
}
