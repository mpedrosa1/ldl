import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const DATA_DIR = path.join(process.cwd(), "data");
const FILE_PATH = path.join(DATA_DIR, "tapo-cameras.json");

export type StreamQuality = "stream1" | "stream2";

export interface TapoCamera {
  id: string;
  name: string;
  host: string;
  username: string;
  password: string;
  streamPath: StreamQuality;
}

export type TapoCameraPublic = Omit<TapoCamera, "password">;

function toPublic(camera: TapoCamera): TapoCameraPublic {
  const { id, name, host, username, streamPath } = camera;
  return { id, name, host, username, streamPath };
}

function newCameraId(): string {
  return `tapo-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

async function readAll(): Promise<TapoCamera[]> {
  try {
    const raw = await readFile(FILE_PATH, "utf-8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw err;
  }
}

async function writeAll(cameras: TapoCamera[]): Promise<void> {
  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(FILE_PATH, JSON.stringify(cameras, null, 2), "utf-8");
}

export async function listCamerasPublic(): Promise<TapoCameraPublic[]> {
  return (await readAll()).map(toPublic);
}

/** Includes the password — server-side use only (building the RTSP URL), never sent to the client. */
export async function getCameraFull(id: string): Promise<TapoCamera | undefined> {
  return (await readAll()).find((c) => c.id === id);
}

export async function createCamera(
  input: Omit<TapoCamera, "id">,
): Promise<TapoCameraPublic> {
  const cameras = await readAll();
  const camera: TapoCamera = { ...input, id: newCameraId() };
  cameras.push(camera);
  await writeAll(cameras);
  return toPublic(camera);
}

export async function updateCamera(
  id: string,
  patch: Partial<Omit<TapoCamera, "id">>,
): Promise<TapoCameraPublic | undefined> {
  const cameras = await readAll();
  const index = cameras.findIndex((c) => c.id === id);
  if (index === -1) return undefined;

  const current = cameras[index];
  const next: TapoCamera = {
    ...current,
    ...patch,
    // An empty/omitted password in an edit means "keep the current one".
    password: patch.password ? patch.password : current.password,
  };
  cameras[index] = next;
  await writeAll(cameras);
  return toPublic(next);
}

export async function deleteCamera(id: string): Promise<boolean> {
  const cameras = await readAll();
  const next = cameras.filter((c) => c.id !== id);
  if (next.length === cameras.length) return false;
  await writeAll(next);
  return true;
}
