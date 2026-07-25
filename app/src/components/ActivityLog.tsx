import type { LogbookEntry } from "@/hooks/useLogbook";
import { ACCENT2, BORDER, CARD_BG, TEXT_MUTED_4, TEXT_SOFT } from "@/lib/theme";

export function ActivityLog({ entries }: { entries: LogbookEntry[] }) {
  return (
    <div
      style={{
        background: CARD_BG,
        border: `1px solid ${BORDER}`,
        borderRadius: 16,
        padding: 20,
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 14 }}>
        Registro de atividades
      </div>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 14,
          overflowY: "auto",
          maxHeight: 380,
        }}
      >
        {entries.length === 0 && (
          <div style={{ fontSize: 13, color: TEXT_MUTED_4 }}>
            Sem atividade recente.
          </div>
        )}
        {entries.map((ev, i) => (
          <div key={`${ev.when}-${i}`} style={{ display: "flex", gap: 10 }}>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                paddingTop: 4,
              }}
            >
              <div
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: ACCENT2,
                }}
              />
            </div>
            <div>
              <div style={{ fontSize: 13, color: TEXT_SOFT }}>
                {ev.name} {ev.message ?? ""}
              </div>
              <div style={{ fontSize: 11, color: TEXT_MUTED_4, marginTop: 2 }}>
                {new Date(ev.when).toLocaleTimeString("pt-BR", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
