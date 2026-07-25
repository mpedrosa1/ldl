import type { HassEntity } from "home-assistant-js-websocket";
import { friendlyName } from "./devices";

export interface PersonLocation {
  entityId: string;
  name: string;
  lat: number;
  lon: number;
  accuracy?: number;
  isHome: boolean;
  state: string;
  lastChanged: string;
  batteryLevel?: number;
}

export interface ZoneMarker {
  entityId: string;
  name: string;
  lat: number;
  lon: number;
  radius: number;
  icon?: string;
}

function toNumber(value: unknown): number | undefined {
  return typeof value === "number" && !Number.isNaN(value) ? value : undefined;
}

export function getPersonLocations(entities: HassEntity[]): PersonLocation[] {
  const byId = new Map(entities.map((e) => [e.entity_id, e]));

  return entities
    .filter((e) => e.entity_id.startsWith("person."))
    .map((e): PersonLocation | null => {
      const lat = toNumber(e.attributes.latitude);
      const lon = toNumber(e.attributes.longitude);
      if (lat === undefined || lon === undefined) return null;

      const source = e.attributes.source as string | undefined;
      const sourceEntity = source ? byId.get(source) : undefined;

      return {
        entityId: e.entity_id,
        name: friendlyName(e),
        lat,
        lon,
        accuracy: toNumber(e.attributes.gps_accuracy),
        isHome: e.state === "home",
        state: e.state,
        lastChanged: e.last_changed,
        batteryLevel: toNumber(sourceEntity?.attributes.battery_level),
      };
    })
    .filter((p): p is PersonLocation => p !== null);
}

export function getZoneMarkers(entities: HassEntity[]): ZoneMarker[] {
  return entities
    .filter((e) => e.entity_id.startsWith("zone."))
    .map((e): ZoneMarker | null => {
      const lat = toNumber(e.attributes.latitude);
      const lon = toNumber(e.attributes.longitude);
      const radius = toNumber(e.attributes.radius);
      if (lat === undefined || lon === undefined || radius === undefined) return null;
      return {
        entityId: e.entity_id,
        name: friendlyName(e),
        lat,
        lon,
        radius,
        icon: e.attributes.icon as string | undefined,
      };
    })
    .filter((z): z is ZoneMarker => z !== null);
}
