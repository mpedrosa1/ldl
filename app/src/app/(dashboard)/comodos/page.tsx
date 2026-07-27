"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useCustomDevices } from "@/hooks/useCustomDevices";
import { useHaAreas } from "@/hooks/useHaAreas";
import { CustomDeviceCard } from "@/components/CustomDeviceCard";
import { ACCENT, BORDER, CHIP_BG, TEXT_DIM, TEXT_DIMMER } from "@/lib/theme";

const NO_AREA_ID = "__sem_area__";
const NO_AREA_NAME = "Sem área";

export default function ComodosPage() {
  const { devices, loaded } = useCustomDevices();
  const { areas } = useHaAreas();
  const [selectedId, setSelectedId] = useState<string | null>(null);

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

  // A aba escolhida deixa de existir quando o cômodo fica sem dispositivos (ou
  // quando um device muda de área); nesse caso cai no primeiro em vez de sumir
  // com a listagem.
  const active = groups.find((g) => g.areaId === selectedId) ?? groups[0];

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
        <div style={{ fontSize: 26, fontWeight: 700 }}>Cômodos</div>
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
          que aparecem aqui, cada um numa Área do Home Assistant — é ela que vira a aba do cômodo.
        </div>
      )}

      {groups.length > 0 && (
        <div
          role="tablist"
          aria-label="Cômodos"
          style={{
            display: "flex",
            gap: 8,
            marginBottom: 20,
            flexWrap: "wrap",
            borderBottom: `1px solid ${BORDER}`,
            paddingBottom: 12,
          }}
        >
          {groups.map((group) => {
            const isActive = group.areaId === active?.areaId;
            return (
              <button
                key={group.areaId}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => setSelectedId(group.areaId)}
                style={{
                  padding: "7px 14px",
                  fontSize: 13,
                  fontWeight: isActive ? 600 : 500,
                  borderRadius: 999,
                  border: `1px solid ${isActive ? ACCENT : BORDER}`,
                  background: isActive ? "transparent" : CHIP_BG,
                  color: isActive ? ACCENT : TEXT_DIM,
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                }}
              >
                {group.name}
                <span style={{ marginLeft: 6, fontSize: 12, opacity: 0.7 }}>
                  {group.devices.length}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {active && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
            gap: 14,
            alignItems: "start",
          }}
        >
          {active.devices.map((device) => (
            <CustomDeviceCard key={device.id} device={device} />
          ))}
        </div>
      )}
    </div>
  );
}
