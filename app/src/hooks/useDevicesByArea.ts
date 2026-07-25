"use client";

import { useMemo } from "react";
import { useHaEntities } from "./useHaEntities";
import { useHaAreas } from "./useHaAreas";
import { augmentDevice, isVisibleDevice, type AugmentedDevice } from "@/lib/ha/devices";

export const NO_AREA_ID = "__sem_area__";
export const NO_AREA_NAME = "Sem área";

export interface RoomGroup {
  areaId: string;
  name: string;
  devices: AugmentedDevice[];
}

export function useDevicesByArea() {
  const { entities, status } = useHaEntities();
  const { areas, entityArea, entityMeta, loaded: areasLoaded } = useHaAreas();

  const rooms = useMemo<RoomGroup[]>(() => {
    const byArea = new Map<string, AugmentedDevice[]>();

    for (const entity of entities) {
      if (!isVisibleDevice(entity, entityMeta[entity.entity_id])) continue;
      const device = augmentDevice(entity);
      if (!device) continue;

      const areaId = entityArea[entity.entity_id] ?? NO_AREA_ID;
      if (!byArea.has(areaId)) byArea.set(areaId, []);
      byArea.get(areaId)!.push(device);
    }

    const groups: RoomGroup[] = areas
      .filter((a) => byArea.has(a.area_id))
      .map((a) => ({
        areaId: a.area_id,
        name: a.name,
        devices: byArea.get(a.area_id)!.sort((x, y) => x.entity.entity_id.localeCompare(y.entity.entity_id)),
      }));

    if (byArea.has(NO_AREA_ID)) {
      groups.push({
        areaId: NO_AREA_ID,
        name: NO_AREA_NAME,
        devices: byArea.get(NO_AREA_ID)!.sort((x, y) => x.entity.entity_id.localeCompare(y.entity.entity_id)),
      });
    }

    return groups;
  }, [entities, areas, entityArea, entityMeta]);

  const allDevices = useMemo(() => rooms.flatMap((r) => r.devices), [rooms]);

  return { status, areasLoaded, rooms, allDevices };
}
