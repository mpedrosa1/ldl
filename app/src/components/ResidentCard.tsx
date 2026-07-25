import { initialsOf } from "@/lib/ha/devices";
import type { PersonLocation } from "@/lib/ha/geo";
import { ACCENT2, SUCCESS, TEXT_MUTED_4 } from "@/lib/theme";

export function ResidentCard({ person }: { person: PersonLocation }) {
  const statusColor = person.isHome ? SUCCESS : ACCENT2;
  const locationLabel = person.isHome ? "Em casa" : person.state;

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <div
        style={{
          width: 34,
          height: 34,
          borderRadius: "50%",
          background: "oklch(0.28 0.016 50 / 0.9)",
          border: `2px solid ${statusColor}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontWeight: 700,
          fontSize: 12,
          flexShrink: 0,
        }}
      >
        {initialsOf(person.name)}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {person.name}
        </div>
        <div style={{ fontSize: 11, color: TEXT_MUTED_4 }}>
          {locationLabel}
          {person.batteryLevel !== undefined ? ` · ${person.batteryLevel}%` : ""}
        </div>
      </div>
      <div
        style={{
          width: 8,
          height: 8,
          borderRadius: "50%",
          background: statusColor,
          flexShrink: 0,
        }}
      />
    </div>
  );
}
