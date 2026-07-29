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
  /** Dispositivo criado em Configurações → Dispositivos (o mesmo que aparece na
   * página Cômodos). É o vínculo usado hoje. */
  deviceId?: string;
  /** Qual entidade do dispositivo o clique liga/desliga. Um dispositivo composto
   * pode ter dezenas de entidades (uma impressora 3D tem 22) — sem escolher,
   * não dá para saber o que acionar. */
  controlEntityId?: string;
  /** Entidades exibidas ao passar o mouse sobre o ícone. */
  infoEntityIds?: string[];
  /** Câmera da página Câmeras, no formato `tapo:<id>` ou `ha:<entity_id>`.
   * Câmeras não são dispositivos compostos — as Tapo nem entidade do HA têm —,
   * por isso têm um vínculo próprio. */
  cameraKey?: string;
  /** Vínculo antigo, direto numa entidade do HA. Mantido só para plantas
   * salvas antes de existirem os dispositivos compostos continuarem
   * funcionando; o editor não oferece mais essa opção. */
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
