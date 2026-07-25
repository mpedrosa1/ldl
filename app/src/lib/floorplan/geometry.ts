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

/** Tight bounding box (in cm, with padding) around everything drawn on a floor plan — used to size a static SVG view without empty space. */
export function computeDocBounds(doc: FloorPlanDoc, paddingCm = 40): Bounds {
  const xs: number[] = [];
  const ys: number[] = [];

  const addBox = (cx: number, cy: number, w: number, h: number) => {
    const r = Math.hypot(w, h) / 2; // rotation-agnostic radius so rotated items stay in frame
    xs.push(cx - r, cx + r);
    ys.push(cy - r, cy + r);
  };

  for (const wall of doc.walls) {
    xs.push(wall.x1, wall.x2);
    ys.push(wall.y1, wall.y2);
  }
  for (const floor of doc.floors) addBox(floor.x, floor.y, floor.width, floor.height);
  for (const item of doc.furniture) addBox(item.x, item.y, item.width, item.height);
  for (const device of doc.devices) {
    addBox(device.x, device.y, device.width ?? DEFAULT_DEVICE_SIZE, device.height ?? DEFAULT_DEVICE_SIZE);
  }

  if (xs.length === 0) return FALLBACK_BOUNDS;

  const minX = Math.min(...xs) - paddingCm;
  const maxX = Math.max(...xs) + paddingCm;
  const minY = Math.min(...ys) - paddingCm;
  const maxY = Math.max(...ys) + paddingCm;
  return { minX, minY, width: maxX - minX, height: maxY - minY };
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
