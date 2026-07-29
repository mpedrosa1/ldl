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

/** Ícones da barra inferior no celular. Traçados simples em `currentColor`
 * para herdarem a cor de ativo/inativo do próprio item. */
const ICONS: Record<string, React.ReactNode> = {
  "/": <path d="M3 10.5 12 3l9 7.5V21h-6v-6H9v6H3z" />,
  "/mapa": (
    <path d="M12 2a7 7 0 0 0-7 7c0 5 7 13 7 13s7-8 7-13a7 7 0 0 0-7-7zm0 9.5A2.5 2.5 0 1 1 12 6.5a2.5 2.5 0 0 1 0 5z" />
  ),
  "/cameras": (
    <path d="M4 6h9a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2zm13 4.5 5-3v9l-5-3z" />
  ),
  "/comodos": <path d="M3 3h8v8H3zm10 0h8v5h-8zM3 13h8v8H3zm10-3h8v11h-8z" />,
  "/energia": <path d="M13 2 4 14h6l-1 8 9-12h-6z" />,
  "/rede": (
    <path d="M12 20a1.8 1.8 0 1 0 0-3.6 1.8 1.8 0 0 0 0 3.6zM6.4 14.2l1.8 1.8a5.4 5.4 0 0 1 7.6 0l1.8-1.8a8 8 0 0 0-11.2 0zM2.8 10.6l1.8 1.8a10.5 10.5 0 0 1 14.8 0l1.8-1.8a13 13 0 0 0-18.4 0z" />
  ),
  "/configuracoes": (
    <path d="M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8zm9 4-2.1-.6a7 7 0 0 0-.6-1.5l1.1-1.9-1.4-1.4-1.9 1.1a7 7 0 0 0-1.5-.6L14 5h-2l-.6 2.1a7 7 0 0 0-1.5.6L8 6.6 6.6 8l1.1 1.9a7 7 0 0 0-.6 1.5L5 12v2l2.1.6q.24.78.6 1.5L6.6 18 8 19.4l1.9-1.1q.72.36 1.5.6L12 21h2l.6-2.1a7 7 0 0 0 1.5-.6l1.9 1.1 1.4-1.4-1.1-1.9q.36-.72.6-1.5L21 14z" />
  ),
};

const NAV_ITEMS = [
  { href: "/", label: "Início" },
  { href: "/mapa", label: "Mapa" },
  { href: "/cameras", label: "Câmeras" },
  { href: "/comodos", label: "Cômodos" },
  { href: "/energia", label: "Energia" },
  { href: "/rede", label: "Rede" },
  { href: "/configuracoes", label: "Configurações" },
];

export function Sidebar() {
  const pathname = usePathname();
  const now = useClock();

  const timeLabel = now ? timeLabelFor(now) : "";
  const dateLabel = now ? dateLabelFor(now) : "";

  return (
    <div
      className="ldl-sidebar"
      style={{ background: SIDEBAR_BG, borderRight: `1px solid ${BORDER}` }}
    >
      <div className="ldl-brand" style={{ padding: "0 8px 28px 8px" }}>
        {/* eslint-disable-next-line @next/next/no-img-element -- static brand logo, no responsive/optimization needs */}
        <img
          src="/logo.png"
          alt="Lar, Doce Lar"
          style={{ width: "75%", height: "auto", display: "block", margin: "0 auto" }}
        />
      </div>

      <div className="ldl-nav">
        {NAV_ITEMS.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className="ldl-nav-item"
              style={{
                background: active ? "oklch(0.32 0.09 75 / 0.16)" : "transparent",
              }}
            >
              {/* Ponto no desktop, ícone no celular — o CSS mostra um de cada
                  vez. Os dois são renderizados porque a troca é por media
                  query, não por medição de largura em JS. */}
              <div
                className="ldl-nav-dot"
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: active ? ACCENT : "oklch(0.45 0.012 50)",
                  flexShrink: 0,
                }}
              />
              <svg
                className="ldl-nav-icon"
                viewBox="0 0 24 24"
                width={21}
                height={21}
                fill="currentColor"
                aria-hidden
                style={{ color: active ? ACCENT : "oklch(0.6 0.01 50)", flexShrink: 0 }}
              >
                {ICONS[item.href]}
              </svg>
              <div
                style={{
                  // Sem `fontSize` inline: no celular a regra da classe reduz
                  // o texto, e inline venceria a media query.
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
        className="ldl-clock"
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
