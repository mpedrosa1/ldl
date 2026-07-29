import type { FloorPlanDoc, Wall } from "./types";

export const PLAN_WIDTH_CM = 1800;
export const PLAN_HEIGHT_CM = 1200;
export const PX_PER_CM = 0.5;
export const GRID_STEP_CM = 100;
export const SNAP_CM = 10;

export const DEFAULT_WALL_THICKNESS = 15;
export const DEFAULT_DOOR_WIDTH = 80;
export const DEFAULT_WINDOW_WIDTH = 100;
export const DEFAULT_DEVICE_SIZE = 40;
export const DEFAULT_FLOOR_SIZE = 300;
export const MIN_ITEM_SIZE_CM = 10;

export function cmToPx(cm: number): number {
  return cm * PX_PER_CM;
}

export function pxToCm(px: number): number {
  return px / PX_PER_CM;
}

export function snapCm(cm: number): number {
  return Math.round(cm / SNAP_CM) * SNAP_CM;
}

export function pointOnWall(wall: Wall, t: number): { x: number; y: number } {
  return {
    x: wall.x1 + (wall.x2 - wall.x1) * t,
    y: wall.y1 + (wall.y2 - wall.y1) * t,
  };
}

export function wallAngleDeg(wall: Wall): number {
  return (Math.atan2(wall.y2 - wall.y1, wall.x2 - wall.x1) * 180) / Math.PI;
}

export function wallLength(wall: Wall): number {
  return Math.hypot(wall.x2 - wall.x1, wall.y2 - wall.y1);
}

/** Resizes a wall to an exact length (cm), keeping x1/y1 and the current angle fixed. */
export function resizeWallLength(wall: Wall, newLengthCm: number): Wall {
  const length = wallLength(wall);
  const length_safe = length === 0 ? 1 : length;
  const ux = (wall.x2 - wall.x1) / length_safe;
  const uy = (wall.y2 - wall.y1) / length_safe;
  const dir = length === 0 ? { x: 1, y: 0 } : { x: ux, y: uy };
  return {
    ...wall,
    x2: wall.x1 + dir.x * newLengthCm,
    y2: wall.y1 + dir.y * newLengthCm,
  };
}

/** Picks a "nice" round tick step (in cm) so ruler marks land roughly every targetPx screen pixels. */
export function niceTickStepCm(pxPerCm: number, targetPx = 80): number {
  const rawStepCm = targetPx / pxPerCm;
  const steps = [10, 20, 50, 100, 200, 500, 1000, 2000, 5000];
  return steps.find((s) => s >= rawStepCm) ?? steps[steps.length - 1];
}

/** Projects a point (in cm) onto a wall segment, returning the closest t (0..1) and the distance to the segment. */
export function projectPointToWall(
  wall: Wall,
  px: number,
  py: number,
): { t: number; distance: number } {
  const dx = wall.x2 - wall.x1;
  const dy = wall.y2 - wall.y1;
  const lengthSq = dx * dx + dy * dy;

  if (lengthSq === 0) {
    return { t: 0, distance: Math.hypot(px - wall.x1, py - wall.y1) };
  }

  let t = ((px - wall.x1) * dx + (py - wall.y1) * dy) / lengthSq;
  t = Math.max(0, Math.min(1, t));

  const closestX = wall.x1 + dx * t;
  const closestY = wall.y1 + dy * t;
  return { t, distance: Math.hypot(px - closestX, py - closestY) };
}

export interface Bounds {
  minX: number;
  minY: number;
  width: number;
  height: number;
}

const FALLBACK_BOUNDS: Bounds = { minX: 0, minY: 0, width: 400, height: 300 };

/** Espaço abaixo do ícone onde o rótulo do dispositivo é desenhado (ver
 * FloorPlanSvgView), para o texto não ficar cortado na borda. */
const DEVICE_LABEL_ROOM_CM = 26;

/**
 * Tight bounding box (in cm, with padding) around everything drawn on a floor
 * plan — used to size a static SVG view without empty space.
 *
 * `includeLabels` reserva o espaço do rótulo dos dispositivos. Fica desligado
 * quando o que se quer é o centro geométrico (ver rotateDoc): essa folga só
 * existe para baixo e não gira junto com a planta, então distorceria o centro.
 */
export function computeDocBounds(
  doc: FloorPlanDoc,
  paddingCm = 10,
  includeLabels = true,
): Bounds {
  const xs: number[] = [];
  const ys: number[] = [];

  /**
   * Caixa exata de um item girado: os quatro cantos, rotacionados. A versão
   * antiga usava o raio do círculo circunscrito, que nunca corta nada mas
   * inflava muito o quadro — num piso de 400×300 sobravam 50cm de cada lado e
   * 100cm em cima e embaixo, só de vazio.
   */
  const addBox = (cx: number, cy: number, w: number, h: number, rotationDeg: number) => {
    const a = (rotationDeg * Math.PI) / 180;
    const cos = Math.cos(a);
    const sin = Math.sin(a);
    for (const [dx, dy] of [
      [-w / 2, -h / 2],
      [w / 2, -h / 2],
      [w / 2, h / 2],
      [-w / 2, h / 2],
    ]) {
      xs.push(cx + dx * cos - dy * sin);
      ys.push(cy + dx * sin + dy * cos);
    }
  };

  for (const wall of doc.walls) {
    // A espessura é desenhada centrada na linha, então metade dela extrapola
    // os extremos em qualquer direção.
    const half = wall.thickness / 2;
    xs.push(wall.x1 - half, wall.x1 + half, wall.x2 - half, wall.x2 + half);
    ys.push(wall.y1 - half, wall.y1 + half, wall.y2 - half, wall.y2 + half);
  }
  for (const floor of doc.floors) addBox(floor.x, floor.y, floor.width, floor.height, floor.rotation);
  for (const item of doc.furniture) addBox(item.x, item.y, item.width, item.height, item.rotation);
  for (const device of doc.devices) {
    const w = device.width ?? DEFAULT_DEVICE_SIZE;
    const h = device.height ?? DEFAULT_DEVICE_SIZE;
    // O ícone gira, mas o rótulo fica sempre embaixo e na horizontal.
    addBox(device.x, device.y, w, h, device.rotation);
    if (includeLabels) ys.push(device.y + Math.max(h, 32) / 2 + DEVICE_LABEL_ROOM_CM);
  }

  if (xs.length === 0) return FALLBACK_BOUNDS;

  const minX = Math.min(...xs) - paddingCm;
  const maxX = Math.max(...xs) + paddingCm;
  const minY = Math.min(...ys) - paddingCm;
  const maxY = Math.max(...ys) + paddingCm;
  return { minX, minY, width: maxX - minX, height: maxY - minY };
}

function rotatePoint(
  x: number,
  y: number,
  cx: number,
  cy: number,
  radians: number,
): { x: number; y: number } {
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);
  const dx = x - cx;
  const dy = y - cy;
  return { x: cx + dx * cos - dy * sin, y: cy + dx * sin + dy * cos };
}

/**
 * Gira a planta inteira em torno do centro do que está desenhado. Serve para
 * quem desenhou num sentido e depois quer acertar a orientação — refazer tudo
 * na mão seria inviável.
 *
 * Portas e janelas não aparecem aqui de propósito: elas são posicionadas por
 * (parede, t) e acompanham a parede sozinhas.
 */
export function rotateDoc(doc: FloorPlanDoc, degrees: number): FloorPlanDoc {
  const bounds = computeDocBounds(doc, 0, false);
  const cx = bounds.minX + bounds.width / 2;
  const cy = bounds.minY + bounds.height / 2;
  const radians = (degrees * Math.PI) / 180;

  const spin = (deg: number) => ((deg + degrees) % 360 + 360) % 360;

  return {
    ...doc,
    walls: doc.walls.map((wall) => {
      const a = rotatePoint(wall.x1, wall.y1, cx, cy, radians);
      const b = rotatePoint(wall.x2, wall.y2, cx, cy, radians);
      return { ...wall, x1: a.x, y1: a.y, x2: b.x, y2: b.y };
    }),
    floors: doc.floors.map((floor) => {
      const p = rotatePoint(floor.x, floor.y, cx, cy, radians);
      return { ...floor, x: p.x, y: p.y, rotation: spin(floor.rotation) };
    }),
    furniture: doc.furniture.map((item) => {
      const p = rotatePoint(item.x, item.y, cx, cy, radians);
      return { ...item, x: p.x, y: p.y, rotation: spin(item.rotation) };
    }),
    devices: doc.devices.map((device) => {
      const p = rotatePoint(device.x, device.y, cx, cy, radians);
      return { ...device, x: p.x, y: p.y, rotation: spin(device.rotation) };
    }),
  };
}

/** Finds the nearest wall to a point, within maxDistanceCm. */
export function findNearestWall(
  walls: Wall[],
  px: number,
  py: number,
  maxDistanceCm: number,
): { wall: Wall; t: number } | null {
  let best: { wall: Wall; t: number; distance: number } | null = null;

  for (const wall of walls) {
    const { t, distance } = projectPointToWall(wall, px, py);
    if (distance <= maxDistanceCm && (!best || distance < best.distance)) {
      best = { wall, t, distance };
    }
  }

  return best ? { wall: best.wall, t: best.t } : null;
}
