"use client";

import { useEffect, useState } from "react";
import { weatherConditionLabel, WEATHER_CONDITION_EMOJI } from "@/lib/ha/devices";
import { BORDER, CARD_BG, TEXT_MUTED_3, TEXT_MUTED_4 } from "@/lib/theme";

interface ForecastItem {
  datetime: string;
  condition: string;
  temperature: number;
  templow?: number;
}

async function fetchForecast(entityId: string, type: "daily" | "hourly"): Promise<ForecastItem[]> {
  const res = await fetch(`/api/ha/weather/${entityId}/forecast?type=${type}`);
  const data = await res.json();
  if (!res.ok || data.error) throw new Error(data.error ?? "forecast error");
  return data.forecast ?? [];
}

export function WeatherForecastModal({
  entityId,
  onClose,
}: {
  entityId: string;
  onClose: () => void;
}) {
  const [daily, setDaily] = useState<ForecastItem[] | null>(null);
  const [hourly, setHourly] = useState<ForecastItem[] | null>(null);
  const failed = daily !== null && hourly !== null && daily.length === 0 && hourly.length === 0;

  useEffect(() => {
    let cancelled = false;
    fetchForecast(entityId, "daily")
      .then((f) => !cancelled && setDaily(f))
      .catch(() => !cancelled && setDaily([]));
    fetchForecast(entityId, "hourly")
      .then((f) => !cancelled && setHourly(f.slice(0, 24)))
      .catch(() => !cancelled && setHourly([]));
    return () => {
      cancelled = true;
    };
  }, [entityId]);

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
          maxHeight: "85vh",
          overflowY: "auto",
          background: CARD_BG,
          border: `1px solid ${BORDER}`,
          borderRadius: 14,
          padding: 20,
        }}
      >
        <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 14 }}>Previsão do tempo</div>

        {failed && (
          <div style={{ fontSize: 13, color: TEXT_MUTED_3 }}>
            Não foi possível carregar a previsão para esta entidade.
          </div>
        )}

        {hourly && hourly.length > 0 && (
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: TEXT_MUTED_3, marginBottom: 8 }}>
              Hoje, por hora
            </div>
            <div style={{ display: "flex", gap: 16, overflowX: "auto", paddingBottom: 6 }}>
              {hourly.map((h) => (
                <div
                  key={h.datetime}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 4,
                    minWidth: 48,
                    flexShrink: 0,
                  }}
                >
                  <div style={{ fontSize: 11, color: TEXT_MUTED_4 }}>
                    {new Date(h.datetime).toLocaleTimeString("pt-BR", { hour: "2-digit" })}
                  </div>
                  <div style={{ fontSize: 18 }}>{WEATHER_CONDITION_EMOJI[h.condition] ?? "•"}</div>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{Math.round(h.temperature)}°</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {daily && daily.length > 0 && (
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: TEXT_MUTED_3, marginBottom: 8 }}>
              Próximos dias
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {daily.map((d) => (
                <div
                  key={d.datetime}
                  style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13 }}
                >
                  <div style={{ width: 70, textTransform: "capitalize" }}>
                    {new Date(d.datetime).toLocaleDateString("pt-BR", { weekday: "short" })}
                  </div>
                  <div style={{ flex: 1, color: TEXT_MUTED_4, minWidth: 0 }}>
                    {WEATHER_CONDITION_EMOJI[d.condition] ?? ""} {weatherConditionLabel(d.condition)}
                  </div>
                  <div style={{ fontWeight: 600, whiteSpace: "nowrap" }}>
                    {Math.round(d.temperature)}°
                    {d.templow != null && (
                      <span style={{ color: TEXT_MUTED_4, fontWeight: 400 }}> / {Math.round(d.templow)}°</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
