import type { HassEntity } from "home-assistant-js-websocket";
import type { CustomDevice } from "@/hooks/useCustomDevices";
import type { TapoCameraPublic } from "@/hooks/useTapoCameras";
import { domainOf, friendlyName, isVisibleDevice } from "@/lib/ha/devices";
import type { EntityMeta } from "@/hooks/useHaAreas";

/**
 * Fonte única de "quais câmeras o sistema tem". Usada pela página Câmeras e
 * pelo editor de planta baixa — se cada uma montasse a própria lista, dava
 * para posicionar na planta uma câmera que não aparece na página (ou o
 * contrário).
 */

export interface CameraOption {
  /** `tapo:<id>` ou `ha:<entity_id>` — também é o que a planta baixa guarda. */
  key: string;
  name: string;
  source: "ha" | "tapo";
  /** Só para as do HA. */
  entityId?: string;
  /** Só para as Tapo. */
  tapoId?: string;
}

/** Câmeras do HA só entram se foram marcadas "Mostrar em Câmeras" ao serem
 * adicionadas a algum dispositivo em Configurações → Dispositivos. */
export function visibleHaCameraIds(customDevices: CustomDevice[]): Set<string> {
  const ids = new Set<string>();
  for (const device of customDevices) {
    for (const entityId of device.entityIds) {
      if (domainOf(entityId) === "camera" && device.cameraVisibility?.[entityId]) {
        ids.add(entityId);
      }
    }
  }
  return ids;
}

export function cameraOptions(
  customDevices: CustomDevice[],
  entities: HassEntity[],
  tapoCameras: TapoCameraPublic[],
  entityMeta: Record<string, EntityMeta> = {},
): CameraOption[] {
  const visible = visibleHaCameraIds(customDevices);

  const ha = entities
    .filter((e) => visible.has(e.entity_id) && isVisibleDevice(e, entityMeta[e.entity_id]))
    .map<CameraOption>((e) => ({
      key: `ha:${e.entity_id}`,
      name: friendlyName(e),
      source: "ha",
      entityId: e.entity_id,
    }));

  const tapo = tapoCameras.map<CameraOption>((c) => ({
    key: `tapo:${c.id}`,
    name: c.name,
    source: "tapo",
    tapoId: c.id,
  }));

  return [...ha, ...tapo];
}
