import { mkdir, readdir, writeFile } from "node:fs/promises";
import path from "node:path";

const BUILTIN_DIR = path.join(process.cwd(), "public", "assets", "icons");
const CUSTOM_DIR = path.join(process.cwd(), "data", "icons");

const ALLOWED_EXTENSIONS = new Set([".png", ".jpg", ".jpeg", ".webp", ".svg", ".gif"]);
const MIME_BY_EXT: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".gif": "image/gif",
};

export interface IconEntry {
  url: string;
  name: string;
}

async function listDir(dir: string): Promise<string[]> {
  try {
    const entries = await readdir(dir, { withFileTypes: true });
    return entries
      .filter((e) => e.isFile() && ALLOWED_EXTENSIONS.has(path.extname(e.name).toLowerCase()))
      .map((e) => e.name);
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw err;
  }
}

export async function listIcons(): Promise<IconEntry[]> {
  const [builtin, custom] = await Promise.all([listDir(BUILTIN_DIR), listDir(CUSTOM_DIR)]);
  return [
    ...builtin.map((name) => ({ url: `/assets/icons/${name}`, name })),
    ...custom.map((name) => ({ url: `/api/icons/file/${name}`, name })),
  ].sort((a, b) => a.name.localeCompare(b.name));
}

/** Strips any path components and unsafe characters, keeping the request confined to CUSTOM_DIR. */
export function sanitizeFilename(name: string): string {
  const base = path.basename(name).replace(/[^a-zA-Z0-9._-]/g, "_");
  return base || "icon";
}

export function isAllowedExtension(filename: string): boolean {
  return ALLOWED_EXTENSIONS.has(path.extname(filename).toLowerCase());
}

export function mimeFor(filename: string): string {
  return MIME_BY_EXT[path.extname(filename).toLowerCase()] ?? "application/octet-stream";
}

export async function saveCustomIcon(filename: string, data: Buffer): Promise<IconEntry> {
  const safeName = sanitizeFilename(filename);
  if (!isAllowedExtension(safeName)) {
    throw new Error("Tipo de arquivo não permitido");
  }
  await mkdir(CUSTOM_DIR, { recursive: true });

  // Avoid clobbering an existing icon with the same name.
  let finalName = safeName;
  let counter = 1;
  const existing = new Set(await listDir(CUSTOM_DIR));
  const ext = path.extname(safeName);
  const stem = safeName.slice(0, safeName.length - ext.length);
  while (existing.has(finalName)) {
    finalName = `${stem}-${counter}${ext}`;
    counter += 1;
  }

  await writeFile(path.join(CUSTOM_DIR, finalName), data);
  return { url: `/api/icons/file/${finalName}`, name: finalName };
}

export function resolveCustomIconPath(filename: string): string {
  const safeName = sanitizeFilename(filename);
  return path.join(CUSTOM_DIR, safeName);
}
