"use client";

import { useMemo } from "react";
import { useHaEntities } from "./useHaEntities";
import { useHaAreas } from "./useHaAreas";
import { augmentDevice, friendlyName, isVisibleDevice, type AugmentedDevice } from "@/lib/ha/devices";

export interface DeviceGroup {
  /** Home Assistant device_id, or a synthetic per-entity key when the entity isn't tied to a device. */
  groupId: string;
  /** False for the synthetic per-entity groups — there's no HA device to rename, only the entity itself. */
  isDevice: boolean;
  name: string;
  areaId: string | null;
  areaName: string | null;
  entities: AugmentedDevice[];
}

/** Groups entities by the physical HA device they belong to (e.g. a single Tapo plug's switch + power/energy sensors appear together), instead of by area. */
export function useDevicesByDevice() {
  const { entities, status } = useHaEntities();
  const { devices, entityDevice, entityMeta, areas, loaded, refresh } = useHaAreas();

  const groups = useMemo<DeviceGroup[]>(() => {
    const areaNameById = new Map(areas.map((a) => [a.area_id, a.name]));
    const deviceById = new Map(devices.map((d) => [d.id, d]));
    const byGroup = new Map<string, AugmentedDevice[]>();

    for (const entity of entities) {
      if (!isVisibleDevice(entity, entityMeta[entity.entity_id])) continue;
      const augmented = augmentDevice(entity);
      if (!augmented) continue;

      const deviceId = entityDevice[entity.entity_id];
      const groupId = deviceId ?? `solo:${entity.entity_id}`;
      if (!byGroup.has(groupId)) byGroup.set(groupId, []);
      byGroup.get(groupId)!.push(augmented);
    }

    const result: DeviceGroup[] = [];
    for (const [groupId, groupEntities] of byGroup) {
      const device = groupId.startsWith("solo:") ? undefined : deviceById.get(groupId);
      const sorted = groupEntities.sort((x, y) => x.entity.entity_id.localeCompare(y.entity.entity_id));
      const name = device ? device.name : friendlyName(sorted[0].entity);
      const areaId = device ? device.area_id : entityMeta[sorted[0].entity.entity_id]?.area_id ?? null;
      result.push({
        groupId,
        isDevice: Boolean(device),
        name,
        areaId,
        areaName: areaId ? areaNameById.get(areaId) ?? null : null,
        entities: sorted,
      });
    }

    result.sort((a, b) => a.name.localeCompare(b.name));
    return result;
  }, [entities, devices, entityDevice, entityMeta, areas]);

  return { status, loaded, groups, refresh };
}
