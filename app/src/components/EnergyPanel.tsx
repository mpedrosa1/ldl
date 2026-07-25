import type { HassEntity } from "home-assistant-js-websocket";
import { friendlyName } from "@/lib/ha/devices";
import { ACCENT2, BORDER, CARD_BG, TEXT_MUTED_2, TEXT_MUTED_4 } from "@/lib/theme";

const ENERGY_DEVICE_CLASSES = new Set(["power", "energy", "current", "voltage"]);

export function getEnergySensors(entities: HassEntity[]): HassEntity[] {
  return entities.filter(
    (e) =>
      e.entity_id.startsWith("sensor.") &&
      ENERGY_DEVICE_CLASSES.has(e.attributes.device_class as string) &&
      e.state !== "unavailable" &&
      e.state !== "unknown",
  );
}

export function EnergyPanel({ entities }: { entities: HassEntity[] }) {
  const sensors = getEnergySensors(entities);

  return (
    <div
      style={{
        background: CARD_BG,
        border: `1px solid ${BORDER}`,
        borderRadius: 16,
        padding: 20,
      }}
    >
      <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 4 }}>
        Consumo de energia
      </div>
      <div style={{ fontSize: 12, color: TEXT_MUTED_2, marginBottom: 16 }}>
        Leitura em tempo real dos sensores de energia do Home Assistant
      </div>

      {sensors.length === 0 ? (
        <div style={{ fontSize: 13, color: TEXT_MUTED_4 }}>
          Nenhum sensor de energia (potência/consumo) encontrado no HA.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {sensors.map((sensor) => (
            <div
              key={sensor.entity_id}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 10,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                <div
                  style={{
                    width: 7,
                    height: 7,
                    borderRadius: "50%",
                    background: ACCENT2,
                    flexShrink: 0,
                  }}
                />
                <div style={{ fontSize: 13, color: TEXT_MUTED_2 }}>
                  {friendlyName(sensor)}
                </div>
              </div>
              <div style={{ fontSize: 14, fontWeight: 600 }}>
                {sensor.state} {sensor.attributes.unit_of_measurement as string}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
