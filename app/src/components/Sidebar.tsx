"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useClock, dateLabelFor, timeLabelFor } from "@/hooks/useClock";
import {
  ACCENT,
  BORDER,
  SIDEBAR_BG,
  TEXT,
  TEXT_MUTED_2,
} from "@/lib/theme";

const NAV_ITEMS = [
  { href: "/", label: "Início" },
  { href: "/mapa", label: "Mapa" },
  { href: "/cameras", label: "Câmeras" },
  { href: "/dispositivos", label: "Dispositivos" },
  { href: "/configuracoes", label: "Configurações" },
];

export function Sidebar() {
  const pathname = usePathname();
  const now = useClock();

  const timeLabel = now ? timeLabelFor(now) : "";
  const dateLabel = now ? dateLabelFor(now) : "";

  return (
    <div
      style={{
        width: 240,
        flexShrink: 0,
        background: SIDEBAR_BG,
        borderRight: `1px solid ${BORDER}`,
        display: "flex",
        flexDirection: "column",
        padding: "24px 16px",
        boxSizing: "border-box",
      }}
    >
      <div style={{ padding: "0 8px 28px 8px" }}>
        {/* eslint-disable-next-line @next/next/no-img-element -- static brand logo, no responsive/optimization needs */}
        <img
          src="/logo.png"
          alt="Lar, Doce Lar"
          style={{ width: "75%", height: "auto", display: "block", margin: "0 auto" }}
        />
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        {NAV_ITEMS.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "10px 12px",
                borderRadius: 10,
                cursor: "pointer",
                background: active
                  ? "oklch(0.32 0.09 75 / 0.16)"
                  : "transparent",
                textDecoration: "none",
              }}
            >
              <div
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: active ? ACCENT : "oklch(0.45 0.012 50)",
                  flexShrink: 0,
                }}
              />
              <div
                style={{
                  fontSize: 14,
                  fontWeight: active ? 700 : 500,
                  color: active ? TEXT : "oklch(0.65 0.01 50)",
                }}
              >
                {item.label}
              </div>
            </Link>
          );
        })}
      </div>

      <div
        style={{
          marginTop: "auto",
          padding: "14px 8px 4px 8px",
          borderTop: `1px solid ${BORDER}`,
        }}
      >
        <div style={{ fontSize: 22, fontWeight: 700 }}>{timeLabel}</div>
        <div
          style={{
            fontSize: 12,
            color: TEXT_MUTED_2,
            textTransform: "capitalize",
            marginTop: 2,
          }}
        >
          {dateLabel}
        </div>
      </div>
    </div>
  );
}
