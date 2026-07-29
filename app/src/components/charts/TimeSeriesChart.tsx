"use client";

import { useMemo } from "react";
import { BORDER, TEXT_MUTED_3 } from "@/lib/theme";

export interface ChartSeries {
  label: string;
  color: string;
  points: { t: number; v: number }[];
}

/** Coordenadas internas fixas: o SVG escala sozinho para a largura do card. */
const W = 800;
const H = 220;
const PAD = { top: 12, right: 8, bottom: 22, left: 46 };

function formatValue(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 1000) return value.toFixed(0);
  if (abs >= 100) return value.toFixed(0);
  if (abs >= 10) return value.toFixed(1);
  if (abs >= 1) return value.toFixed(2);
  return value.toFixed(abs === 0 ? 0 : 2);
}

function formatTime(ms: number): string {
  return new Date(ms).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

/**
 * Gráfico de linha para histórico de sensores. Feito à mão em SVG de
 * propósito: são poucas séries, o visual precisa casar com o tema do LDL, e
 * não valia trazer uma biblioteca de gráficos só para isto.
 */
export function TimeSeriesChart({
  series,
  unit,
  height = 220,
  /** Fixa o piso do eixo em zero — natural para potência e velocidade. */
  zeroBased = true,
}: {
  series: ChartSeries[];
  unit?: string;
  height?: number;
  zeroBased?: boolean;
}) {
  const model = useMemo(() => {
    const all = series.flatMap((s) => s.points);
    if (all.length < 2) return null;

    const tMin = Math.min(...all.map((p) => p.t));
    const tMax = Math.max(...all.map((p) => p.t));
    const vMinRaw = Math.min(...all.map((p) => p.v));
    const vMaxRaw = Math.max(...all.map((p) => p.v));

    const vMin = zeroBased ? Math.min(0, vMinRaw) : vMinRaw;
    // Série constante viraria uma linha colada na borda — abre um pouco.
    const vMax = vMaxRaw === vMin ? vMin + 1 : vMaxRaw;
    const span = vMax - vMin;

    const x = (t: number) =>
      PAD.left + ((t - tMin) / Math.max(tMax - tMin, 1)) * (W - PAD.left - PAD.right);
    const y = (v: number) =>
      PAD.top + (1 - (v - vMin) / span) * (H - PAD.top - PAD.bottom);

    return { tMin, tMax, vMin, vMax, x, y };
  }, [series, zeroBased]);

  if (!model) {
    return (
      <div style={{ fontSize: 13, color: TEXT_MUTED_3, padding: "24px 0" }}>
        Sem histórico suficiente para o gráfico ainda.
      </div>
    );
  }

  const { tMin, tMax, vMin, vMax, x, y } = model;
  const yTicks = [vMin, vMin + (vMax - vMin) / 2, vMax];
  const xTicks = [tMin, tMin + (tMax - tMin) / 2, tMax];

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="none"
      style={{ display: "block", width: "100%", height }}
    >
      {yTicks.map((v, i) => (
        <g key={i}>
          <line x1={PAD.left} y1={y(v)} x2={W - PAD.right} y2={y(v)} stroke={BORDER} strokeWidth={1} />
          <text x={PAD.left - 6} y={y(v) + 3} fontSize={10} fill={TEXT_MUTED_3} textAnchor="end">
            {formatValue(v)}
          </text>
        </g>
      ))}

      {xTicks.map((t, i) => (
        <text
          key={i}
          x={x(t)}
          y={H - 6}
          fontSize={10}
          fill={TEXT_MUTED_3}
          textAnchor={i === 0 ? "start" : i === xTicks.length - 1 ? "end" : "middle"}
        >
          {formatTime(t)}
        </text>
      ))}

      {series.map((s) => {
        if (s.points.length < 2) return null;
        const line = s.points.map((p, i) => `${i === 0 ? "M" : "L"} ${x(p.t)} ${y(p.v)}`).join(" ");
        const area = `${line} L ${x(s.points[s.points.length - 1].t)} ${y(vMin)} L ${x(s.points[0].t)} ${y(vMin)} Z`;
        return (
          <g key={s.label}>
            <path d={area} fill={s.color} opacity={0.12} />
            <path
              d={line}
              fill="none"
              stroke={s.color}
              strokeWidth={2}
              // O viewBox é esticado (preserveAspectRatio="none"); sem isto a
              // espessura da linha ficaria deformada junto.
              vectorEffect="non-scaling-stroke"
              strokeLinejoin="round"
            />
          </g>
        );
      })}

      {unit && (
        <text x={PAD.left - 6} y={PAD.top - 2} fontSize={10} fill={TEXT_MUTED_3} textAnchor="end">
          {unit}
        </text>
      )}
    </svg>
  );
}

export function ChartLegend({ series }: { series: ChartSeries[] }) {
  return (
    <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginTop: 8 }}>
      {series.map((s) => (
        <div key={s.label} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12 }}>
          <div style={{ width: 10, height: 3, borderRadius: 2, background: s.color }} />
          <span style={{ color: TEXT_MUTED_3 }}>{s.label}</span>
        </div>
      ))}
    </div>
  );
}
