"use client";

import { ACCENT, BORDER, CARD_BG, DANGER, TEXT_MUTED_2, TEXT_MUTED_3 } from "@/lib/theme";

/** Peças visuais compartilhadas pelas páginas Energia e Rede. */

/**
 * O período mais longo é limitado pelo recorder do Home Assistant, que guarda
 * só alguns dias de histórico — pedir uma semana devolve nada e a página
 * pareceria quebrada.
 */
export const PERIOD_OPTIONS = [
  { hours: 6, label: "6h" },
  { hours: 24, label: "24h" },
  { hours: 72, label: "3 dias" },
];

export function PeriodPicker({
  hours,
  onChange,
}: {
  hours: number;
  onChange: (hours: number) => void;
}) {
  return (
    <div style={{ display: "flex", gap: 6 }}>
      {PERIOD_OPTIONS.map((option) => {
        const active = option.hours === hours;
        return (
          <div
            key={option.hours}
            className="ldl-chip"
            onClick={() => onChange(option.hours)}
            style={{
              padding: "6px 14px",
              borderRadius: 999,
              fontSize: 12,
              fontWeight: 700,
              cursor: "pointer",
              border: `1px solid ${active ? ACCENT : BORDER}`,
              background: active ? "oklch(0.78 0.15 75 / 0.16)" : undefined,
              color: active ? ACCENT : TEXT_MUTED_2,
            }}
          >
            {option.label}
          </div>
        );
      })}
    </div>
  );
}

export function Panel({
  title,
  hint,
  children,
  right,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
  right?: React.ReactNode;
}) {
  return (
    <div
      style={{
        background: CARD_BG,
        border: `1px solid ${BORDER}`,
        borderRadius: 16,
        padding: 20,
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 12,
          marginBottom: hint ? 4 : 14,
          flexWrap: "wrap",
        }}
      >
        <div style={{ fontSize: 16, fontWeight: 600 }}>{title}</div>
        {right}
      </div>
      {hint && <div style={{ fontSize: 12, color: TEXT_MUTED_3, marginBottom: 14 }}>{hint}</div>}
      {children}
    </div>
  );
}

export function StatCard({
  label,
  value,
  unit,
  detail,
  tone = "normal",
}: {
  label: string;
  value: string;
  unit?: string;
  detail?: string;
  tone?: "normal" | "accent" | "danger" | "muted";
}) {
  const color =
    tone === "accent" ? ACCENT : tone === "danger" ? DANGER : tone === "muted" ? TEXT_MUTED_3 : undefined;

  return (
    <div
      style={{
        background: CARD_BG,
        border: `1px solid ${BORDER}`,
        borderRadius: 14,
        padding: "14px 16px",
        minWidth: 0,
      }}
    >
      <div style={{ fontSize: 11, color: TEXT_MUTED_3, marginBottom: 6 }}>{label}</div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 5, minWidth: 0 }}>
        <div
          style={{
            fontSize: 22,
            fontWeight: 700,
            color,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {value}
        </div>
        {unit && <div style={{ fontSize: 12, color: TEXT_MUTED_3 }}>{unit}</div>}
      </div>
      {detail && (
        <div style={{ fontSize: 11, color: TEXT_MUTED_3, marginTop: 4 }}>{detail}</div>
      )}
    </div>
  );
}

export function StatGrid({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
        gap: 12,
      }}
    >
      {children}
    </div>
  );
}

/** Lista simples de entidade → valor, usada no rodapé das duas páginas. */
export function SensorRow({
  name,
  value,
  offline,
}: {
  name: string;
  value: string;
  offline?: boolean;
}) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        gap: 12,
        padding: "8px 0",
        borderBottom: `1px solid ${BORDER}`,
        fontSize: 13,
      }}
    >
      <div style={{ color: TEXT_MUTED_2, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis" }}>
        {name}
      </div>
      <div style={{ fontWeight: 600, color: offline ? DANGER : undefined, whiteSpace: "nowrap" }}>
        {value}
      </div>
    </div>
  );
}
