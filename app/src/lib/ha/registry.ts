import { getHaConnection } from "./client";

export interface HaArea {
  area_id: string;
  name: string;
}

interface DeviceRegistryEntry {
  id: string;
  area_id: string | null;
  name: string | null;
  name_by_user: string | null;
}

export interface HaDevice {
  id: string;
  name: string;
  area_id: string | null;
}

interface EntityRegistryEntry {
  entity_id: string;
  area_id: string | null;
  device_id: string | null;
  entity_category: "config" | "diagnostic" | null;
  hidden_by: string | null;
  disabled_by: string | null;
}

export interface EntityMeta {
  area_id: string | null;
  entity_category: "config" | "diagnostic" | null;
  hidden: boolean;
}

export interface AreaAssignments {
  areas: HaArea[];
  devices: HaDevice[];
  /** entity_id -> area_id (null when the entity has no assigned area). */
  entityArea: Record<string, string | null>;
  /** entity_id -> device_id (null when the entity isn't tied to a physical device). */
  entityDevice: Record<string, string | null>;
  /** entity_id -> registry metadata used to hide diagnostic/config/hidden/disabled entities from the dashboard. */
  entityMeta: Record<string, EntityMeta>;
}

declare global {
  var __haAreaCache:
    | { expiresAt: number; data: Promise<AreaAssignments> }
    | undefined;
}

const CACHE_TTL_MS = 5 * 60 * 1000;

async function fetchAreaAssignments(): Promise<AreaAssignments> {
  const connection = await getHaConnection();

  const [areas, devices, entities] = await Promise.all([
    connection.sendMessagePromise<HaArea[]>({
      type: "config/area_registry/list",
    }),
    connection.sendMessagePromise<DeviceRegistryEntry[]>({
      type: "config/device_registry/list",
    }),
    connection.sendMessagePromise<EntityRegistryEntry[]>({
      type: "config/entity_registry/list",
    }),
  ]);

  const deviceArea = new Map(devices.map((d) => [d.id, d.area_id]));

  const entityArea: Record<string, string | null> = {};
  const entityDevice: Record<string, string | null> = {};
  const entityMeta: Record<string, EntityMeta> = {};
  for (const entity of entities) {
    const area_id =
      entity.area_id ?? (entity.device_id ? (deviceArea.get(entity.device_id) ?? null) : null);
    entityArea[entity.entity_id] = area_id;
    entityDevice[entity.entity_id] = entity.device_id;
    entityMeta[entity.entity_id] = {
      area_id,
      entity_category: entity.entity_category,
      hidden: Boolean(entity.hidden_by || entity.disabled_by),
    };
  }

  const deviceList: HaDevice[] = devices.map((d) => ({
    id: d.id,
    name: d.name_by_user ?? d.name ?? d.id,
    area_id: d.area_id,
  }));

  return { areas, devices: deviceList, entityArea, entityDevice, entityMeta };
}

/** Areas/devices rarely change, so we cache the registry lookup for a few minutes instead of refetching on every request. */
export function getAreaAssignments(): Promise<AreaAssignments> {
  const now = Date.now();
  if (!global.__haAreaCache || global.__haAreaCache.expiresAt < now) {
    global.__haAreaCache = {
      expiresAt: now + CACHE_TTL_MS,
      data: fetchAreaAssignments(),
    };
    global.__haAreaCache.data.catch(() => {
      global.__haAreaCache = undefined;
    });
  }
  return global.__haAreaCache.data;
}

/** Renames an entity's registry name override (the same field the HA frontend's own rename dialog writes) — a two-way sync, since HA already flows back into our own entity list live via the SSE stream. */
export async function renameEntity(entityId: string, name: string): Promise<void> {
  const connection = await getHaConnection();
  await connection.sendMessagePromise({
    type: "config/entity_registry/update",
    entity_id: entityId,
    name,
  });
}
