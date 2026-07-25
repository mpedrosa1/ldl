import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { EMPTY_FLOOR_PLAN, type FloorPlanDoc } from "./types";

const DATA_DIR = path.join(process.cwd(), "data");
const FILE_PATH = path.join(DATA_DIR, "floorplan.json");

export async function readFloorPlan(): Promise<FloorPlanDoc> {
  try {
    const raw = await readFile(FILE_PATH, "utf-8");
    const parsed = JSON.parse(raw) as Partial<FloorPlanDoc>;
    // Backfills fields added after a plan was first saved (e.g. `furniture`).
    return { ...EMPTY_FLOOR_PLAN, ...parsed };
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return EMPTY_FLOOR_PLAN;
    throw err;
  }
}

export async function writeFloorPlan(doc: FloorPlanDoc): Promise<void> {
  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(FILE_PATH, JSON.stringify(doc, null, 2), "utf-8");
}
