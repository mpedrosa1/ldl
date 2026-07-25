export type DeviceIconType =
  | "light"
  | "tv"
  | "projector"
  | "streaming"
  | "speaker"
  | "ac"
  | "switch"
  | "lock"
  | "camera"
  | "fan"
  | "sensor"
  | "generic";

/** Wall segment. Coordinates and thickness are in centimeters. */
export interface Wall {
  id: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  thickness: number;
}

/** A door or window opening placed along a wall. */
export interface Opening {
  id: string;
  wallId: string;
  /** Position along the wall, 0 (start) to 1 (end). */
  t: number;
  /** Opening width in centimeters. */
  width: number;
  kind: "door" | "window";
}

/** A device icon placed freely on the plan, optionally bound to a real HA entity. */
export interface PlacedDevice {
  id: string;
  x: number;
  y: number;
  /** Bounding box in centimeters. Optional for backward compatibility with plans saved before resizing existed. */
  width?: number;
  height?: number;
  rotation: number;
  icon: DeviceIconType;
  /** Custom image URL (e.g. from the icon library) overriding the emoji. */
  imageUrl?: string;
  label: string;
  entityId?: string;
}

/** A piece of furniture placed to scale on the plan — purely visual, not tied to HA. */
export interface FurnitureItem {
  id: string;
  x: number;
  y: number;
  /** Real-world size in centimeters. */
  width: number;
  height: number;
  rotation: number;
  imageUrl?: string;
  label: string;
}

/** A floor/ground area drawn behind everything else, so the plan isn't a plain black backdrop. */
export interface FloorArea {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  fill: string;
  imageUrl?: string;
  label: string;
}

export interface FloorPlanDoc {
  walls: Wall[];
  openings: Opening[];
  devices: PlacedDevice[];
  furniture: FurnitureItem[];
  floors: FloorArea[];
}

export const EMPTY_FLOOR_PLAN: FloorPlanDoc = {
  walls: [],
  openings: [],
  devices: [],
  furniture: [],
  floors: [],
};

export function newId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}
