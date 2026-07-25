"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useCustomDevices } from "@/hooks/useCustomDevices";
import { useHaAreas } from "@/hooks/useHaAreas";
import { CustomDeviceCard } from "@/components/CustomDeviceCard";
import { ACCENT, TEXT_DIMMER } from "@/lib/theme";

const NO_AREA_ID = "__sem_area__";
const NO_AREA_NAME = "Sem área";

export default function DispositivosPage() {
  const { devices, loaded } = useCustomDevices();
  const { areas } = useHaAreas();

  const groups = useMemo(() => {
    const byArea = new Map<string, typeof devices>();

    for (const device of devices) {
      const areaId = device.areaId ?? NO_AREA_ID;
      if (!byArea.has(areaId)) byArea.set(areaId, []);
      byArea.get(areaId)!.push(device);
    }

    const result = areas
      .filter((a) => byArea.has(a.area_id))
      .map((a) => ({ areaId: a.area_id, name: a.name, devices: byArea.get(a.area_id)! }));

    if (byArea.has(NO_AREA_ID)) {
      result.push({ areaId: NO_AREA_ID, name: NO_AREA_NAME, devices: byArea.get(NO_AREA_ID)! });
    }

    return result;
  }, [devices, areas]);

  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 20,
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        <div style={{ fontSize: 26, fontWeight: 700 }}>Dispositivos</div>
        <Link
          href="/configuracoes/entidades"
          style={{
            fontSize: 13,
            color: ACCENT,
            textDecoration: "none",
          }}
        >
          + Criar dispositivo
        </Link>
      </div>

      {loaded && devices.length === 0 && (
        <div style={{ fontSize: 14, color: TEXT_DIMMER }}>
          Nenhum dispositivo criado ainda. Vá em Configurações → Dispositivos para montar os cards
          que aparecem aqui.
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
        {groups.map((group) => (
          <div key={group.areaId}>
            <div
              style={{
                fontSize: 15,
                fontWeight: 600,
                marginBottom: 12,
                color: "oklch(0.8 0.006 50)",
              }}
            >
              {group.name}
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
                gap: 14,
                alignItems: "start",
              }}
            >
              {group.devices.map((device) => (
                <CustomDeviceCard key={device.id} device={device} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
