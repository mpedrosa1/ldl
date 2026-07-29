"use client";

import { useCallback, useEffect, useState } from "react";

export interface HistorySeries {
  entityId: string;
  unit?: string;
  points: { t: number; v: number }[];
}

/** Histórico é caro de consultar e muda devagar — recarrega a cada 5 min. */
const REFRESH_MS = 5 * 60_000;

export function useHaHistory(entityIds: string[], hours: number) {
  const [series, setSeries] = useState<HistorySeries[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // A lista vem de um `useMemo` do chamador ou de um literal; a chave em texto
  // evita refazer a busca a cada render por causa da identidade do array.
  const key = entityIds.join(",");

  const refresh = useCallback(() => {
    if (!key) {
      // Também assíncrono: mexer no estado direto no corpo do efeito dispara
      // uma cascata de renders (e a regra do lint que a proíbe).
      return Promise.resolve().then(() => {
        setSeries([]);
        setLoaded(true);
      });
    }
    return fetch(`/api/ha/history?entity_id=${encodeURIComponent(key)}&hours=${hours}`)
      .then((res) => res.json().then((data) => ({ ok: res.ok, data })))
      .then(({ ok, data }) => {
        if (ok && Array.isArray(data.series)) {
          setSeries(data.series);
          setError(null);
        } else {
          setError(data?.error ?? "Não foi possível carregar o histórico");
        }
      })
      .catch(() => setError("Não foi possível carregar o histórico"))
      .finally(() => setLoaded(true));
  }, [key, hours]);

  useEffect(() => {
    refresh();
    const timer = setInterval(refresh, REFRESH_MS);
    return () => clearInterval(timer);
  }, [refresh]);

  return { series, loaded, error, refresh };
}

/** Série de um id específico, já pronta para o gráfico. */
export function seriesFor(series: HistorySeries[], entityId: string): HistorySeries | undefined {
  return series.find((s) => s.entityId === entityId);
}
