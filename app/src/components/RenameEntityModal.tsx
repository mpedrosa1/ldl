"use client";

import { useState } from "react";
import { ACCENT, BORDER, CARD_BG, DANGER, INPUT_BG, TEXT_MUTED_3 } from "@/lib/theme";

const inputStyle: React.CSSProperties = {
  background: INPUT_BG,
  border: "1px solid oklch(0.38 0.017 50)",
  borderRadius: 6,
  padding: "8px 10px",
  color: "oklch(0.94 0.006 50)",
  fontSize: 13,
  width: "100%",
  boxSizing: "border-box",
  marginBottom: 12,
};

/** Renames one entity through HA's own entity registry (config/entity_registry/update) — the same field the HA frontend's rename dialog writes, so it's a two-way sync rather than a name that only exists in our copy. */
export function RenameEntityModal({
  entityId,
  currentName,
  onClose,
  onRenamed,
}: {
  entityId: string;
  currentName: string;
  onClose: () => void;
  onRenamed?: () => void;
}) {
  const [name, setName] = useState(currentName);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    if (!name.trim()) {
      setError("Nome é obrigatório.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/ha/entities/${entityId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(data?.error ?? "Não foi possível renomear.");
        return;
      }
      onRenamed?.();
      onClose();
    } finally {
      setBusy(false);
    }
  }

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
        zIndex: 70,
        padding: 16,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "min(360px, 92vw)",
          background: CARD_BG,
          border: `1px solid ${BORDER}`,
          borderRadius: 14,
          padding: 20,
        }}
      >
        <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>Renomear entidade</div>
        <div style={{ fontSize: 11, color: TEXT_MUTED_3, marginBottom: 12 }}>{entityId}</div>

        <input
          style={inputStyle}
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoFocus
        />

        {error && <div style={{ fontSize: 12, color: DANGER, marginBottom: 10 }}>{error}</div>}

        <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
          <div
            onClick={busy ? undefined : handleSave}
            style={{
              background: ACCENT,
              color: "oklch(0.15 0.01 50)",
              fontWeight: 700,
              fontSize: 13,
              padding: "8px 16px",
              borderRadius: 8,
              cursor: busy ? "default" : "pointer",
              opacity: busy ? 0.6 : 1,
            }}
          >
            {busy ? "Salvando..." : "Salvar"}
          </div>
          <div onClick={onClose} style={{ fontSize: 12, color: TEXT_MUTED_3, cursor: "pointer" }}>
            Cancelar
          </div>
        </div>
      </div>
    </div>
  );
}
