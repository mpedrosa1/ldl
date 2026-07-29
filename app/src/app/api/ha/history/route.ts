import { NextResponse } from "next/server";
import { getHaConfig } from "@/lib/ha/client";

export const dynamic = "force-dynamic";

const MAX_HOURS = 24 * 14;

interface HaHistoryPoint {
  state: string;
  last_changed?: string;
  last_updated?: string;
  entity_id?: string;
  attributes?: Record<string, unknown>;
}

export interface HistorySeries {
  entityId: string;
  unit?: string;
  /** Só os pontos numéricos: estados como "unavailable" viram buraco na série. */
  points: { t: number; v: number }[];
}

/**
 * Histórico de sensores do Home Assistant, para os gráficos das páginas
 * Energia e Rede. O estado ao vivo já chega pelo SSE; isto é o passado, que
 * só o recorder do HA tem.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const entityIds = (url.searchParams.get("entity_id") ?? "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);
  const hours = Math.min(Math.max(Number(url.searchParams.get("hours")) || 24, 1), MAX_HOURS);

  if (entityIds.length === 0) {
    return NextResponse.json({ error: "entity_id é obrigatório" }, { status: 400 });
  }

  try {
    const { hassUrl, accessToken } = getHaConfig();
    const since = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
    // `minimal_response` corta o payload bastante; os atributos do primeiro
    // ponto de cada série são preservados, que é de onde vem a unidade.
    const endpoint =
      `${hassUrl}/api/history/period/${since}` +
      `?filter_entity_id=${encodeURIComponent(entityIds.join(","))}&minimal_response`;

    const res = await fetch(endpoint, {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: "no-store",
    });
    if (!res.ok) {
      return NextResponse.json({ error: `Home Assistant respondeu ${res.status}` }, { status: 502 });
    }

    const raw: HaHistoryPoint[][] = await res.json();

    const series: HistorySeries[] = raw
      .filter((list) => list.length > 0)
      .map((list) => {
        const entityId = list[0].entity_id ?? "";
        const unit = list[0].attributes?.unit_of_measurement as string | undefined;

        const points = list
          .map((p) => {
            const value = Number(p.state);
            const when = p.last_changed ?? p.last_updated;
            if (!Number.isFinite(value) || !when) return null;
            return { t: new Date(when).getTime(), v: value };
          })
          .filter((p): p is { t: number; v: number } => p !== null);

        // O HA só devolve *mudanças* de estado. Um sensor parado no mesmo valor
        // devolve um ponto só, e o gráfico ficaria vazio — o valor vale até
        // agora, então a série é estendida até o instante atual.
        const last = points[points.length - 1];
        if (last && last.t < Date.now() - 60_000) {
          points.push({ t: Date.now(), v: last.v });
        }

        return { entityId, unit, points };
      });

    return NextResponse.json({ series, hours });
  } catch (err) {
    console.error("[api/ha/history]", err);
    return NextResponse.json({ error: "Não foi possível falar com o Home Assistant" }, { status: 502 });
  }
}
