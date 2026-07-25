import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const DATA_DIR = path.join(process.cwd(), "data");
const FILE_PATH = path.join(DATA_DIR, "custom-devices.json");

export interface CustomDevice {
  id: string;
  name: string;
  icon?: string;
  areaId?: string;
  /** Order matters — this is the display order of each entity's row on the card. */
  entityIds: string[];
  /** "Interruptor" devices show one combined on/off switch instead of a row per entity — turning it drives every entity in entityIds together (all on or all off), rather than each toggling from its own state. */
  isSwitch?: boolean;
  /** For camera-domain entities in entityIds: whether that camera also shows up on the Câmeras page (asked when the camera is added to a device, since there's no more standalone entity visibility screen). Defaults to hidden if absent. */
  cameraVisibility?: Record<string, boolean>;
}

function newDeviceId(): string {
  return `device-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

async function readAll(): Promise<CustomDevice[]> {
  try {
    const raw = await readFile(FILE_PATH, "utf-8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw err;
  }
}

async function writeAll(devices: CustomDevice[]): Promise<void> {
  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(FILE_PATH, JSON.stringify(devices, null, 2), "utf-8");
}

export async function listCustomDevices(): Promise<CustomDevice[]> {
  return readAll();
}

export async function createCustomDevice(
  input: Omit<CustomDevice, "id">,
): Promise<CustomDevice> {
  const devices = await readAll();
  const device: CustomDevice = { ...input, id: newDeviceId() };
  devices.push(device);
  await writeAll(devices);
  return device;
}

export async function updateCustomDevice(
  id: string,
  patch: Partial<Omit<CustomDevice, "id">>,
): Promise<CustomDevice | undefined> {
  const devices = await readAll();
  const index = devices.findIndex((d) => d.id === id);
  if (index === -1) return undefined;

  const next: CustomDevice = { ...devices[index], ...patch };
  devices[index] = next;
  await writeAll(devices);
  return next;
}

export async function deleteCustomDevice(id: string): Promise<boolean> {
  const devices = await readAll();
  const next = devices.filter((d) => d.id !== id);
  if (next.length === devices.length) return false;
  await writeAll(next);
  return true;
}
