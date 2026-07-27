import { callService, subscribeEntities, type HassEntities } from "home-assistant-js-websocket";
import { getHaConnection } from "@/lib/ha/client";
import { getCameraFull } from "@/lib/tapo/store";
import { setPrivacyMode } from "@/lib/tapo/api";
import { colorServiceData, lightKelvinRange, WARM_WHITE_KELVIN } from "@/lib/ha/lightColor";
import { listAutomations, readVariables, writeVariables, type VariableStore } from "./store";
import {
  MAX_LOOP_ITERATIONS,
  MAX_RUN_DURATION_MS,
  MAX_RUN_LOG_ENTRIES,
  type Automation,
  type AutomationRunEntry,
  type Block,
  type Condition,
  type Trigger,
  type Value,
} from "./types";

/**
 * Motor de automações do LDL. Roda dentro do processo do servidor Next (subido
 * pelo `instrumentation.ts`), avalia os gatilhos por conta própria e só usa o
 * Home Assistant como braço executor — nenhuma automação é criada lá.
 */

interface EngineState {
  started: boolean;
  automations: Automation[];
  variables: VariableStore;
  entities: HassEntities;
  /** Evita empilhar execuções da mesma automação. */
  running: Set<string>;
  /** Gatilhos de intervalo: quando cada um rodou pela última vez. */
  lastIntervalRun: Map<string, number>;
  /** Gatilhos de horário: "id@HH:MM" já disparados hoje. */
  firedTimeSlots: Set<string>;
  runLog: AutomationRunEntry[];
  ticker?: ReturnType<typeof setInterval>;
}

declare global {
  var __ldlAutomationEngine: EngineState | undefined;
}

function state(): EngineState {
  if (!global.__ldlAutomationEngine) {
    global.__ldlAutomationEngine = {
      started: false,
      automations: [],
      variables: {},
      entities: {},
      running: new Set(),
      lastIntervalRun: new Map(),
      firedTimeSlots: new Set(),
      runLog: [],
    };
  }
  return global.__ldlAutomationEngine;
}

// ---------------------------------------------------------------- valores

function toNumber(value: unknown): number | null {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "boolean") return value ? 1 : 0;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function resolveValue(value: Value): string | number | boolean {
  const s = state();

  switch (value.kind) {
    case "literal":
      return value.value;
    case "entityState":
      return s.entities[value.entityId]?.state ?? "";
    case "entityAttribute": {
      const attr = s.entities[value.entityId]?.attributes?.[value.attribute];
      return attr == null || typeof attr === "object" ? "" : (attr as string | number | boolean);
    }
    case "variable":
      return s.variables[value.name] ?? "";
    case "math": {
      const left = toNumber(resolveValue(value.left)) ?? 0;
      const right = toNumber(resolveValue(value.right)) ?? 0;
      switch (value.op) {
        case "+":
          return left + right;
        case "-":
          return left - right;
        case "*":
          return left * right;
        case "/":
          return right === 0 ? 0 : left / right;
      }
    }
  }
}

// ---------------------------------------------------------------- condições

function minutesOfDay(date: Date): number {
  return date.getHours() * 60 + date.getMinutes();
}

function parseClock(text: string): number | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(text.trim());
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]);
}

function evaluateCondition(condition: Condition): boolean {
  switch (condition.kind) {
    case "compare": {
      const left = resolveValue(condition.left);
      const right = resolveValue(condition.right);
      const leftNum = toNumber(left);
      const rightNum = toNumber(right);

      // Compara como número sempre que os dois lados forem numéricos — sem
      // isso, "9" > "10" daria verdadeiro por ordem alfabética.
      if (leftNum !== null && rightNum !== null) {
        switch (condition.op) {
          case "==":
            return leftNum === rightNum;
          case "!=":
            return leftNum !== rightNum;
          case "<":
            return leftNum < rightNum;
          case "<=":
            return leftNum <= rightNum;
          case ">":
            return leftNum > rightNum;
          case ">=":
            return leftNum >= rightNum;
        }
      }

      const leftText = String(left);
      const rightText = String(right);
      switch (condition.op) {
        case "==":
          return leftText === rightText;
        case "!=":
          return leftText !== rightText;
        case "<":
          return leftText < rightText;
        case "<=":
          return leftText <= rightText;
        case ">":
          return leftText > rightText;
        case ">=":
          return leftText >= rightText;
      }
      return false;
    }
    case "timeRange": {
      const from = parseClock(condition.from);
      const to = parseClock(condition.to);
      if (from === null || to === null) return false;
      const now = minutesOfDay(new Date());
      // Faixa que cruza a meia-noite (22:00 → 06:00) é a união dos dois lados.
      return from <= to ? now >= from && now <= to : now >= from || now <= to;
    }
    case "and":
      return condition.items.every(evaluateCondition);
    case "or":
      return condition.items.some(evaluateCondition);
    case "not":
      return !evaluateCondition(condition.item);
  }
}

// ---------------------------------------------------------------- execução

class StopSignal extends Error {}

interface RunContext {
  deadline: number;
  messages: string[];
  variablesTouched: boolean;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function runBlocks(blocks: Block[], ctx: RunContext): Promise<void> {
  for (const block of blocks) {
    if (Date.now() > ctx.deadline) {
      ctx.messages.push("Automação interrompida: passou do tempo máximo de execução.");
      throw new StopSignal();
    }
    await runBlock(block, ctx);
  }
}

async function runBlock(block: Block, ctx: RunContext): Promise<void> {
  const s = state();

  switch (block.kind) {
    case "if":
      await runBlocks(evaluateCondition(block.condition) ? block.then : block.otherwise, ctx);
      return;

    case "repeat": {
      const requested = Math.floor(toNumber(resolveValue(block.times)) ?? 0);
      const times = Math.min(Math.max(requested, 0), MAX_LOOP_ITERATIONS);
      if (requested > MAX_LOOP_ITERATIONS) {
        ctx.messages.push(`"Repetir" limitado a ${MAX_LOOP_ITERATIONS} vezes.`);
      }
      for (let i = 0; i < times; i += 1) await runBlocks(block.body, ctx);
      return;
    }

    case "while": {
      let iterations = 0;
      while (evaluateCondition(block.condition)) {
        if (iterations >= MAX_LOOP_ITERATIONS) {
          ctx.messages.push(
            `"Enquanto" parou em ${MAX_LOOP_ITERATIONS} repetições — a condição nunca ficou falsa.`,
          );
          break;
        }
        if (Date.now() > ctx.deadline) {
          ctx.messages.push("Automação interrompida: passou do tempo máximo de execução.");
          throw new StopSignal();
        }
        await runBlocks(block.body, ctx);
        iterations += 1;
      }
      return;
    }

    case "wait": {
      const seconds = Math.max(toNumber(resolveValue(block.seconds)) ?? 0, 0);
      // Nunca espera além do prazo da execução, senão o guarda de tempo só
      // seria notado depois que a espera inteira terminasse.
      const ms = Math.min(seconds * 1000, Math.max(ctx.deadline - Date.now(), 0));
      await sleep(ms);
      return;
    }

    case "turn": {
      if (block.entityIds.length === 0) return;
      const connection = await getHaConnection();
      await callService(
        connection,
        "homeassistant",
        block.on ? "turn_on" : "turn_off",
        {},
        { entity_id: block.entityIds },
      );
      return;
    }

    case "light": {
      if (block.entityIds.length === 0) return;

      // A primeira lâmpada do bloco serve de referência para faixa de kelvin e
      // suporte a branco — num bloco só normalmente são lâmpadas iguais.
      const reference = s.entities[block.entityIds[0]];
      const data: Record<string, unknown> = {};

      if (block.mode === "temp") {
        const [minK, maxK] = lightKelvinRange(reference);
        const requested = toNumber(resolveValue(block.kelvin ?? { kind: "literal", value: WARM_WHITE_KELVIN }));
        if (requested !== null) {
          data.color_temp_kelvin = Math.min(Math.max(Math.round(requested), minK), maxK);
        }
      } else if (block.color) {
        // Passa pela mesma regra dos cards: um branco escolhido no quadrado de
        // cor vira temperatura, senão a lâmpada acende só os LEDs coloridos.
        Object.assign(data, colorServiceData(block.color, reference));
      }

      if (block.brightnessPct) {
        const pct = toNumber(resolveValue(block.brightnessPct));
        if (pct !== null) data.brightness_pct = Math.min(Math.max(Math.round(pct), 0), 100);
      }

      const connection = await getHaConnection();
      await callService(connection, "light", "turn_on", data, { entity_id: block.entityIds });
      return;
    }

    case "setNumber": {
      const value = toNumber(resolveValue(block.value));
      if (value === null) {
        ctx.messages.push(`Valor inválido para ${block.entityId}.`);
        return;
      }
      const connection = await getHaConnection();
      await callService(connection, "number", "set_value", { value }, { entity_id: block.entityId });
      return;
    }

    case "cameraPrivacy": {
      const camera = await getCameraFull(block.cameraId);
      if (!camera) {
        ctx.messages.push("Câmera não encontrada.");
        return;
      }
      await setPrivacyMode(camera, block.enabled);
      return;
    }

    case "setVariable":
      s.variables[block.name] = resolveValue(block.value);
      ctx.variablesTouched = true;
      return;

    case "log":
      ctx.messages.push(block.message);
      return;

    case "stop":
      throw new StopSignal();
  }
}

export async function runAutomation(automation: Automation): Promise<AutomationRunEntry> {
  const s = state();
  const startedAt = new Date();
  const ctx: RunContext = {
    deadline: Date.now() + MAX_RUN_DURATION_MS,
    messages: [],
    variablesTouched: false,
  };

  let ok = true;
  s.running.add(automation.id);
  try {
    await runBlocks(automation.blocks, ctx);
  } catch (err) {
    if (!(err instanceof StopSignal)) {
      ok = false;
      ctx.messages.push(err instanceof Error ? err.message : String(err));
    }
  } finally {
    s.running.delete(automation.id);
  }

  if (ctx.variablesTouched) {
    await writeVariables(s.variables).catch((err) =>
      console.error("[automations] falha ao salvar variáveis", err),
    );
  }

  const entry: AutomationRunEntry = {
    automationId: automation.id,
    automationName: automation.name,
    startedAt: startedAt.toISOString(),
    finishedAt: new Date().toISOString(),
    ok,
    messages: ctx.messages,
  };
  s.runLog.unshift(entry);
  s.runLog.splice(MAX_RUN_LOG_ENTRIES);
  return entry;
}

function trigger(automation: Automation): void {
  const s = state();
  if (!automation.enabled || s.running.has(automation.id)) return;
  runAutomation(automation).catch((err) =>
    console.error(`[automations] ${automation.name} falhou`, err),
  );
}

// ---------------------------------------------------------------- gatilhos

function matchesStateTrigger(
  t: Extract<Trigger, { kind: "state" }>,
  before: string | undefined,
  after: string,
): boolean {
  if (before === after) return false;
  if (t.from && before !== t.from) return false;
  if (t.to && after !== t.to) return false;
  return true;
}

function onEntitiesChanged(next: HassEntities): void {
  const s = state();
  const previous = s.entities;
  s.entities = next;

  // Primeira carga não é "mudança de estado" — senão tudo dispararia junto no
  // boot do servidor.
  if (Object.keys(previous).length === 0) return;

  for (const automation of s.automations) {
    if (!automation.enabled || automation.trigger.kind !== "state") continue;
    const { entityId } = automation.trigger;
    const after = next[entityId]?.state;
    if (after == null) continue;
    if (matchesStateTrigger(automation.trigger, previous[entityId]?.state, after)) {
      trigger(automation);
    }
  }
}

function onTick(): void {
  const s = state();
  const now = new Date();
  const clock = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  const day = now.toISOString().slice(0, 10);

  for (const automation of s.automations) {
    if (!automation.enabled) continue;

    if (automation.trigger.kind === "time") {
      // O ticker roda mais de uma vez por minuto: a marca por dia+minuto é o
      // que impede o mesmo horário disparar várias vezes.
      const slot = `${automation.id}@${day}@${automation.trigger.at}`;
      if (automation.trigger.at === clock && !s.firedTimeSlots.has(slot)) {
        s.firedTimeSlots.add(slot);
        trigger(automation);
      }
    }

    if (automation.trigger.kind === "interval") {
      const everyMs = Math.max(automation.trigger.everyMinutes, 1) * 60_000;
      const last = s.lastIntervalRun.get(automation.id) ?? 0;
      if (Date.now() - last >= everyMs) {
        s.lastIntervalRun.set(automation.id, Date.now());
        // Pula o disparo do boot: o primeiro tick só marca o relógio.
        if (last !== 0) trigger(automation);
      }
    }
  }

  if (s.firedTimeSlots.size > 200) {
    for (const slot of s.firedTimeSlots) {
      if (!slot.includes(`@${day}@`)) s.firedTimeSlots.delete(slot);
    }
  }
}

// ---------------------------------------------------------------- ciclo de vida

export async function reloadAutomations(): Promise<void> {
  state().automations = await listAutomations();
}

export function getRunLog(): AutomationRunEntry[] {
  return state().runLog;
}

export function getVariables(): VariableStore {
  return state().variables;
}

export async function startAutomationEngine(): Promise<void> {
  const s = state();
  if (s.started) return;
  s.started = true;

  s.variables = await readVariables().catch(() => ({}));
  await reloadAutomations().catch((err) =>
    console.error("[automations] falha ao carregar automações", err),
  );

  s.ticker = setInterval(onTick, 20_000);

  // A conexão com o HA pode demorar (ou estar fora do ar) — o motor sobe
  // mesmo assim, e os gatilhos de horário/intervalo já funcionam.
  getHaConnection()
    .then((connection) => {
      subscribeEntities(connection, onEntitiesChanged);
      console.log("[automations] motor conectado ao Home Assistant");
    })
    .catch((err) => console.error("[automations] sem conexão com o HA", err));
}
