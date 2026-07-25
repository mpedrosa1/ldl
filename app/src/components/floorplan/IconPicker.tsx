"use client";

import { useRef } from "react";
import { useIconLibrary } from "@/hooks/useIconLibrary";
import { ACCENT, BORDER, DANGER, TEXT_MUTED_3 } from "@/lib/theme";

export function IconPicker({
  value,
  onSelect,
}: {
  value?: string;
  onSelect: (url: string | undefined) => void;
}) {
  const { icons, upload, error, loading } = useIconLibrary();
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const icon = await upload(file);
    if (icon) onSelect(icon.url);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 6,
          maxHeight: 140,
          overflowY: "auto",
        }}
      >
        <div
          onClick={() => onSelect(undefined)}
          style={{
            aspectRatio: "1",
            borderRadius: 6,
            border: `1px solid ${!value ? ACCENT : BORDER}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 10,
            color: TEXT_MUTED_3,
            cursor: "pointer",
            textAlign: "center",
          }}
        >
          Nenhuma
        </div>
        {icons.map((icon) => (
          <div
            key={icon.url}
            onClick={() => onSelect(icon.url)}
            title={icon.name}
            style={{
              aspectRatio: "1",
              borderRadius: 6,
              border: `1px solid ${value === icon.url ? ACCENT : BORDER}`,
              background: "oklch(0.32 0.016 50)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              overflow: "hidden",
              padding: 4,
              boxSizing: "border-box",
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- small dynamic thumbnail from user-managed icon library */}
            <img
              src={icon.url}
              alt={icon.name}
              style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }}
            />
          </div>
        ))}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/svg+xml,image/gif"
        onChange={handleFileChange}
        style={{ display: "none" }}
      />
      <div
        onClick={() => fileInputRef.current?.click()}
        style={{
          fontSize: 12,
          color: ACCENT,
          cursor: "pointer",
          textAlign: "center",
          padding: "6px",
          border: `1px dashed ${BORDER}`,
          borderRadius: 6,
        }}
      >
        {loading ? "Carregando..." : "+ Enviar imagem"}
      </div>
      {error && <div style={{ fontSize: 11, color: DANGER }}>{error}</div>}
    </div>
  );
}
