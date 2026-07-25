"use client";

import type { DeviceGroup } from "@/hooks/useDevicesByDevice";
import { ACCENT, BORDER, CARD_BG, TEXT_MUTED_3 } from "@/lib/theme";

export function SuggestionsModal({
  suggestions,
  onUse,
  onClose,
}: {
  suggestions: DeviceGroup[];
  onUse: (group: DeviceGroup) => void;
  onClose: () => void;
}) {
  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "oklch(0.1 0.01 50 / 0.85)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 60,
        padding: 16,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "min(480px, 92vw)",
          maxHeight: "80vh",
          overflowY: "auto",
          background: CARD_BG,
          border: `1px solid ${BORDER}`,
          borderRadius: 14,
          padding: 20,
        }}
      >
        <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 4 }}>Dispositivos sugeridos</div>
        <div style={{ fontSize: 12, color: TEXT_MUTED_3, marginBottom: 16 }}>
          Esses grupos já existem como um dispositivo só lá no Home Assistant — use como ponto de
          partida e ajuste antes de criar.
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {suggestions.map((group) => (
            <div
              key={group.groupId}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                background: "oklch(0.30 0.015 50)",
                border: `1px dashed ${BORDER}`,
                borderRadius: 10,
                padding: "10px 14px",
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{group.name}</div>
                <div style={{ fontSize: 11, color: TEXT_MUTED_3 }}>
                  {group.entities.length} entidade{group.entities.length === 1 ? "" : "s"}
                  {group.areaName ? ` · ${group.areaName}` : ""}
                </div>
              </div>
              <div onClick={() => onUse(group)} style={{ fontSize: 12, color: ACCENT, cursor: "pointer" }}>
                Usar sugestão
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
