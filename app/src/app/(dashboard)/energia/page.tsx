"use client";

import { useMemo, useState } from "react";
import type { HassEntity } from "home-assistant-js-websocket";
import { useHaEntities } from "@/hooks/useHaEntities";
import { useHaHistory, seriesFor } from "@/hooks/useHaHistory";
import { friendlyName } from "@/lib/ha/devices";
import { ChartLegend, TimeSeriesChart, type ChartSeries } from "@/components/charts/TimeSeriesChart";
import { Panel, PeriodPicker, SensorRow, StatCard, StatGrid } from "@/components/analytics/AnalyticsUi";
import { ACCENT, DANGER, TEXT_MUTED_3 } from "@/lib/theme";

/** Sensores de energia são achados pelo device_class, não por id fixo — assim
 * a página continua funcionando se o medidor for trocado por outro modelo. */
const ENERGY_CLASSES = ["power", "energy", "voltage", "current"] as const;
type EnergyClass = (typeof ENERGY_CLASSES)[number];

function classOf(entity: HassEntity): EnergyClass | undefined {
  const dc = entity.attributes.device_class as string | undefined;
  return ENERGY_CLASSES.includes(dc as EnergyClass) ? (dc as EnergyClass) : undefined;
}

function isOffline(entity: HassEntity | undefined): boolean {
  return !entity || entity.state === "unavailable" || entity.state === "unknown";
}

function numberOf(entity: HassEntity | undefined): number | null {
  if (isOffline(entity)) return null;
  const value = Number(entity!.state);
  return Number.isFinite(value) ? value : null;
}

function show(value: number | null, digits = 1): string {
  return value === null ? "—" : value.toFixed(digits);
}

export default function EnergiaPage() {
  const { entities } = useHaEntities();
  const [hours, setHours] = useState(24);

  const sensors = useMemo(
    () => entities.filter((e) => e.entity_id.startsWith("sensor.") && classOf(e) !== undefined),
    [entities],
  );

  const byClass = useMemo(() => {
    const pick = (kind: EnergyClass) => sensors.filter((e) => classOf(e) === kind);
    return {
      power: pick("power"),
      energy: pick("energy"),
      voltage: pick("voltage"),
      current: pick("current"),
    };
  }, [sensors]);

  const power = byClass.power[0];
  const energy = byClass.energy[0];
  const voltage = byClass.voltage[0];
  const current = byClass.current[0];

  const historyIds = useMemo(
    () => [power, energy, voltage].filter((e): e is HassEntity => e != null).map((e) => e.entity_id),
    [power, energy, voltage],
  );
  const { series, loaded } = useHaHistory(historyIds, hours);

  const powerSeries = power ? seriesFor(series, power.entity_id) : undefined;
  const energySeries = energy ? seriesFor(series, energy.entity_id) : undefined;

  const powerChart: ChartSeries[] = powerSeries
    ? [{ label: "Potência", color: ACCENT, points: powerSeries.points }]
    : [];

  /** O contador de energia só cresce, então o gasto do período é a diferença
   * entre a última e a primeira leitura — mais útil que o acumulado de sempre. */
  const consumedInPeriod = useMemo(() => {
    const points = energySeries?.points ?? [];
    if (points.length < 2) return null;
    const delta = points[points.length - 1].v - points[0].v;
    return delta >= 0 ? delta : null;
  }, [energySeries]);

  const powerStats = useMemo(() => {
    const points = powerSeries?.points ?? [];
    if (points.length === 0) return null;
    const values = points.map((p) => p.v);
    return {
      max: Math.max(...values),
      avg: values.reduce((sum, v) => sum + v, 0) / values.length,
    };
  }, [powerSeries]);

  const meterOffline = isOffline(power) && isOffline(energy);
  const periodLabel = hours >= 24 ? `${Math.round(hours / 24)}d` : `${hours}h`;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <div style={{ fontSize: 26, fontWeight: 700 }}>Energia</div>
        <PeriodPicker hours={hours} onChange={setHours} />
      </div>

      {sensors.length === 0 ? (
        <Panel title="Nenhum medidor de energia">
          <div style={{ fontSize: 13, color: TEXT_MUTED_3 }}>
            Não há sensores de potência ou consumo no Home Assistant. Assim que um medidor for
            adicionado lá, ele aparece aqui sozinho.
          </div>
        </Panel>
      ) : (
        <>
          {meterOffline && (
            <Panel title="Medidor sem comunicação">
              <div style={{ fontSize: 13, color: TEXT_MUTED_3 }}>
                O medidor está <strong style={{ color: DANGER }}>indisponível</strong> no Home
                Assistant agora — os números abaixo mostram o último histórico gravado, e voltam a
                atualizar sozinhos quando ele reconectar.
              </div>
            </Panel>
          )}

          <StatGrid>
            <StatCard
              label="Potência agora"
              value={show(numberOf(power), 0)}
              unit="W"
              tone={isOffline(power) ? "muted" : "accent"}
              detail={isOffline(power) ? "sem leitura" : friendlyName(power)}
            />
            <StatCard
              label={`Consumo (${periodLabel})`}
              value={consumedInPeriod === null ? "—" : consumedInPeriod.toFixed(2)}
              unit="kWh"
              detail={
                energy && !isOffline(energy)
                  ? `total acumulado ${Number(energy.state).toFixed(2)} kWh`
                  : "sem histórico no período"
              }
            />
            <StatCard
              label={`Pico de potência (${periodLabel})`}
              value={powerStats ? powerStats.max.toFixed(0) : "—"}
              unit="W"
              detail={powerStats ? `média ${powerStats.avg.toFixed(0)} W` : undefined}
            />
            <StatCard
              label="Tensão / corrente"
              value={`${show(numberOf(voltage), 0)} V`}
              detail={`${show(numberOf(current), 2)} A`}
              tone={isOffline(voltage) ? "muted" : "normal"}
            />
          </StatGrid>

          <Panel
            title="Potência ao longo do tempo"
            hint="Quanto a casa está puxando da rede, em watts."
          >
            {!loaded ? (
              <div style={{ fontSize: 13, color: TEXT_MUTED_3 }}>Carregando histórico...</div>
            ) : powerChart.length === 0 ? (
              <div style={{ fontSize: 13, color: TEXT_MUTED_3 }}>
                {power
                  ? "O Home Assistant não guardou histórico de potência nesse período."
                  : "Nenhum sensor de potência encontrado."}
              </div>
            ) : (
              <>
                <TimeSeriesChart series={powerChart} unit="W" />
                <ChartLegend series={powerChart} />
              </>
            )}
          </Panel>

          <Panel title="Sensores do medidor" hint="Leitura ao vivo de cada grandeza.">
            <div>
              {sensors.map((sensor) => (
                <SensorRow
                  key={sensor.entity_id}
                  name={friendlyName(sensor)}
                  offline={isOffline(sensor)}
                  value={
                    isOffline(sensor)
                      ? "indisponível"
                      : `${sensor.state} ${sensor.attributes.unit_of_measurement ?? ""}`.trim()
                  }
                />
              ))}
            </div>
          </Panel>
        </>
      )}
    </div>
  );
}
