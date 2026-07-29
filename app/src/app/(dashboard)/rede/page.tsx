"use client";

import { useMemo, useState } from "react";
import type { HassEntity } from "home-assistant-js-websocket";
import { useHaEntities } from "@/hooks/useHaEntities";
import { useHaAreas } from "@/hooks/useHaAreas";
import { useHaHistory, seriesFor } from "@/hooks/useHaHistory";
import { friendlyName } from "@/lib/ha/devices";
import { ChartLegend, TimeSeriesChart, type ChartSeries } from "@/components/charts/TimeSeriesChart";
import { Panel, PeriodPicker, SensorRow, StatCard, StatGrid } from "@/components/analytics/AnalyticsUi";
import { ACCENT, ACCENT2, DANGER, SUCCESS, TEXT_MUTED_2, TEXT_MUTED_3 } from "@/lib/theme";

function isOffline(entity: HassEntity | undefined): boolean {
  return !entity || entity.state === "unavailable" || entity.state === "unknown";
}

function has(entity: HassEntity, ...fragments: string[]): boolean {
  const id = entity.entity_id.toLowerCase();
  return fragments.every((f) => id.includes(f));
}

/** Converte um uptime em segundos para algo legível. */
function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hoursPart = Math.floor((seconds % 86400) / 3600);
  if (days > 0) return `${days}d ${hoursPart}h`;
  const minutes = Math.floor((seconds % 3600) / 60);
  return `${hoursPart}h ${minutes}min`;
}

/** Normaliza taxas para Mbit/s, que é como se fala de internet no dia a dia. */
function toMbits(value: number, unit: string | undefined): number {
  switch (unit) {
    case "KiB/s":
      return (value * 1024 * 8) / 1_000_000;
    case "MB/s":
      return (value * 8 * 1_000_000) / 1_000_000;
    case "kbit/s":
      return value / 1000;
    case "Mbit/s":
    default:
      return value;
  }
}

export default function RedePage() {
  const { entities } = useHaEntities();
  const { entityDevice } = useHaAreas();
  const [hours, setHours] = useState(24);

  // Descoberto por device_class e pelo *dispositivo* do HA, não por nome: um
  // sensor de speedtest chamado "velocidade_download" casaria com qualquer
  // filtro textual por "download" e entraria no gráfico do roteador.
  const net = useMemo(() => {
    const sensors = entities.filter((e) => e.entity_id.startsWith("sensor."));
    const dc = (e: HassEntity) => e.attributes.device_class as string | undefined;
    const rates = sensors.filter((e) => dc(e) === "data_rate");

    const wanStatus =
      entities.find((e) => e.entity_id.startsWith("binary_sensor.") && dc(e) === "connectivity") ??
      sensors.find((e) => has(e, "wan"));
    const externalIp = sensors.find((e) => has(e, "external_ip") || has(e, "ip_externo"));
    const uptime = sensors.find((e) => dc(e) === "duration" && has(e, "uptime"));

    // O roteador é o dispositivo dono do status da WAN (ou do IP externo /
    // uptime). As taxas dele são o tráfego real da internet.
    const routerDeviceId =
      [wanStatus, externalIp, uptime]
        .map((e) => (e ? entityDevice[e.entity_id] : null))
        .find((id) => id != null) ?? null;

    const routerRates = routerDeviceId
      ? rates.filter((e) => entityDevice[e.entity_id] === routerDeviceId)
      : [];

    return {
      wanStatus,
      externalIp,
      uptime,
      rates,
      routerRates,
      // Speedtest: medição de banda em Mbit/s, feita fora do roteador.
      speedtest: rates.find(
        (e) =>
          e.attributes.unit_of_measurement === "Mbit/s" &&
          entityDevice[e.entity_id] !== routerDeviceId,
      ),
      signals: sensors.filter((e) => dc(e) === "signal_strength"),
      trackers: entities.filter((e) => e.entity_id.startsWith("device_tracker.")),
    };
  }, [entities, entityDevice]);

  const download = net.routerRates.find((e) => has(e, "download"));
  const upload = net.routerRates.find((e) => has(e, "upload"));

  const historyIds = useMemo(
    () =>
      [download, upload, net.speedtest]
        .filter((e): e is HassEntity => e != null)
        .map((e) => e.entity_id),
    [download, upload, net.speedtest],
  );
  const { series, loaded } = useHaHistory(historyIds, hours);

  /** As séries do roteador vêm em KiB/s; o gráfico mostra tudo em Mbit/s. */
  const throughputChart: ChartSeries[] = useMemo(() => {
    const build = (entity: HassEntity | undefined, label: string, color: string) => {
      if (!entity) return null;
      const s = seriesFor(series, entity.entity_id);
      if (!s) return null;
      const unit = entity.attributes.unit_of_measurement as string | undefined;
      return { label, color, points: s.points.map((p) => ({ t: p.t, v: toMbits(p.v, unit) })) };
    };
    return [build(download, "Download", ACCENT2), build(upload, "Upload", ACCENT)].filter(
      (s): s is ChartSeries => s !== null,
    );
  }, [series, download, upload]);

  const speedChart: ChartSeries[] = useMemo(() => {
    if (!net.speedtest) return [];
    const s = seriesFor(series, net.speedtest.entity_id);
    return s ? [{ label: "Banda medida", color: SUCCESS, points: s.points }] : [];
  }, [series, net.speedtest]);

  const speedStats = useMemo(() => {
    const points = speedChart[0]?.points ?? [];
    if (points.length === 0) return null;
    const values = points.map((p) => p.v);
    return {
      min: Math.min(...values),
      avg: values.reduce((sum, v) => sum + v, 0) / values.length,
    };
  }, [speedChart]);

  const wanUp =
    net.wanStatus &&
    ["on", "connected", "up", "home"].includes(net.wanStatus.state.toLowerCase());
  const uptimeSeconds = net.uptime && !isOffline(net.uptime) ? Number(net.uptime.state) : null;

  const emCasa = net.trackers.filter((t) => t.state === "home");
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
        <div style={{ fontSize: 26, fontWeight: 700 }}>Rede</div>
        <PeriodPicker hours={hours} onChange={setHours} />
      </div>

      <StatGrid>
        <StatCard
          label="WAN"
          value={net.wanStatus ? (wanUp ? "Conectada" : "Fora do ar") : "—"}
          tone={net.wanStatus ? (wanUp ? "accent" : "danger") : "muted"}
          detail={net.externalIp && !isOffline(net.externalIp) ? `IP ${net.externalIp.state}` : undefined}
        />
        <StatCard
          label="Banda medida"
          value={net.speedtest && !isOffline(net.speedtest) ? Number(net.speedtest.state).toFixed(0) : "—"}
          unit="Mbit/s"
          detail={
            speedStats ? `mín ${speedStats.min.toFixed(0)} · média ${speedStats.avg.toFixed(0)}` : undefined
          }
        />
        <StatCard
          label="Roteador ligado há"
          value={uptimeSeconds !== null ? formatUptime(uptimeSeconds) : "—"}
          detail={net.uptime ? friendlyName(net.uptime) : undefined}
        />
        <StatCard
          label="Dispositivos em casa"
          value={String(emCasa.length)}
          detail={`de ${net.trackers.length} rastreado${net.trackers.length === 1 ? "" : "s"}`}
        />
      </StatGrid>

      <Panel
        title="Tráfego da WAN"
        hint="Quanto está passando pela internet agora, convertido para Mbit/s."
      >
        {!loaded ? (
          <div style={{ fontSize: 13, color: TEXT_MUTED_3 }}>Carregando histórico...</div>
        ) : throughputChart.length === 0 ? (
          <div style={{ fontSize: 13, color: TEXT_MUTED_3 }}>
            {net.routerRates.length > 0
              ? "O Home Assistant não guardou histórico dessas taxas nesse período."
              : "O roteador não expõe sensores de taxa de transferência no Home Assistant."}
          </div>
        ) : (
          <>
            <TimeSeriesChart series={throughputChart} unit="Mbit/s" />
            <ChartLegend series={throughputChart} />
          </>
        )}
      </Panel>

      <Panel title={`Banda contratada x medida (${periodLabel})`} hint="Resultado das medições de velocidade.">
        {!loaded ? (
          <div style={{ fontSize: 13, color: TEXT_MUTED_3 }}>Carregando histórico...</div>
        ) : speedChart.length === 0 ? (
          <div style={{ fontSize: 13, color: TEXT_MUTED_3 }}>
            {net.speedtest
              ? "O Home Assistant não guardou histórico desse sensor nesse período."
              : "Nenhum sensor de medição de velocidade encontrado."}
          </div>
        ) : (
          <>
            <TimeSeriesChart series={speedChart} unit="Mbit/s" />
            <ChartLegend series={speedChart} />
          </>
        )}
      </Panel>

      <div className="ldl-grid-2" style={{ gridTemplateColumns: "1fr 1fr" }}>
        <Panel title="Quem está na rede" hint="Rastreadores de presença do Home Assistant.">
          {net.trackers.length === 0 ? (
            <div style={{ fontSize: 13, color: TEXT_MUTED_3 }}>Nenhum dispositivo rastreado.</div>
          ) : (
            <div>
              {net.trackers.map((tracker) => {
                const home = tracker.state === "home";
                return (
                  <div
                    key={tracker.entity_id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      padding: "8px 0",
                      borderBottom: "1px solid oklch(0.36 0.016 50)",
                      fontSize: 13,
                    }}
                  >
                    <div
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: "50%",
                        background: home ? SUCCESS : "oklch(0.48 0.012 50)",
                        flexShrink: 0,
                      }}
                    />
                    <div style={{ flex: 1, minWidth: 0, color: TEXT_MUTED_2 }}>
                      {friendlyName(tracker)}
                    </div>
                    <div style={{ fontWeight: 600, color: home ? SUCCESS : TEXT_MUTED_3 }}>
                      {home ? "em casa" : tracker.state}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Panel>

        <Panel title="Sinal e taxas" hint="Leitura ao vivo dos sensores de rede.">
          {net.signals.length === 0 && net.rates.length === 0 ? (
            <div style={{ fontSize: 13, color: TEXT_MUTED_3 }}>Nenhum sensor de rede encontrado.</div>
          ) : (
            <div>
              {[...net.signals, ...net.rates].map((sensor) => (
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
          )}
        </Panel>
      </div>

      {!net.wanStatus && !net.speedtest && net.rates.length === 0 && (
        <div style={{ fontSize: 12, color: DANGER }}>
          Nenhum sensor de rede foi encontrado no Home Assistant.
        </div>
      )}
    </div>
  );
}
