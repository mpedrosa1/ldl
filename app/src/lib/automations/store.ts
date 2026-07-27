import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { Automation } from "./types";

const DATA_DIR = path.join(process.cwd(), "data");
const FILE_PATH = path.join(DATA_DIR, "automations.json");
/** Valores das variáveis ficam separados da definição: um é configuração que o
 * usuário edita, o outro é estado que a execução altera sozinha. */
const VARS_PATH = path.join(DATA_DIR, "automation-variables.json");

function newAutomationId(): string {
  return `auto-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

async function readJson<T>(filePath: string, fallback: T): Promise<T> {
  try {
    return JSON.parse(await readFile(filePath, "utf-8")) as T;
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return fallback;
    throw err;
  }
}

async function writeJson(filePath: string, data: unknown): Promise<void> {
  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(filePath, JSON.stringify(data, null, 2), "utf-8");
}

export async function listAutomations(): Promise<Automation[]> {
  const parsed = await readJson<Automation[]>(FILE_PATH, []);
  return Array.isArray(parsed) ? parsed : [];
}

export async function getAutomation(id: string): Promise<Automation | undefined> {
  return (await listAutomations()).find((a) => a.id === id);
}

export async function createAutomation(input: Omit<Automation, "id">): Promise<Automation> {
  const automations = await listAutomations();
  const automation: Automation = { ...input, id: newAutomationId() };
  automations.push(automation);
  await writeJson(FILE_PATH, automations);
  return automation;
}

export async function updateAutomation(
  id: string,
  patch: Partial<Omit<Automation, "id">>,
): Promise<Automation | undefined> {
  const automations = await listAutomations();
  const index = automations.findIndex((a) => a.id === id);
  if (index === -1) return undefined;

  automations[index] = { ...automations[index], ...patch };
  await writeJson(FILE_PATH, automations);
  return automations[index];
}

export async function deleteAutomation(id: string): Promise<boolean> {
  const automations = await listAutomations();
  const next = automations.filter((a) => a.id !== id);
  if (next.length === automations.length) return false;
  await writeJson(FILE_PATH, next);
  return true;
}

export type VariableStore = Record<string, string | number | boolean>;

export async function readVariables(): Promise<VariableStore> {
  const parsed = await readJson<VariableStore>(VARS_PATH, {});
  return parsed && typeof parsed === "object" ? parsed : {};
}

export async function writeVariables(vars: VariableStore): Promise<void> {
  await writeJson(VARS_PATH, vars);
}
