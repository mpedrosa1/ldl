import { WARM_WHITE_KELVIN } from "@/lib/ha/lightColor";
import type { Block, BlockKind, Condition, Trigger, Value } from "./types";

/** Categorias no espírito do Scratch: a cor é o que deixa a automação legível
 * de relance, antes mesmo de ler o texto do bloco. */
export type BlockCategory = "controle" | "acao" | "dados";

export const CATEGORY_COLOR: Record<BlockCategory, string> = {
  controle: "oklch(0.72 0.12 195)", // ciano — decide o caminho
  acao: "oklch(0.72 0.14 145)", // verde — mexe em algo de verdade
  dados: "oklch(0.68 0.15 300)", // roxo — variáveis e anotações
};

export const TRIGGER_COLOR = "oklch(0.78 0.15 75)"; // âmbar — o começo de tudo

interface BlockMeta {
  label: string;
  category: BlockCategory;
}

export const BLOCK_META: Record<BlockKind, BlockMeta> = {
  if: { label: "Se … senão", category: "controle" },
  repeat: { label: "Repetir N vezes", category: "controle" },
  while: { label: "Enquanto", category: "controle" },
  wait: { label: "Esperar", category: "controle" },
  stop: { label: "Parar automação", category: "controle" },
  turn: { label: "Ligar / desligar", category: "acao" },
  light: { label: "Cor e brilho da luz", category: "acao" },
  setNumber: { label: "Definir valor numérico", category: "acao" },
  cameraPrivacy: { label: "Modo privacidade da câmera", category: "acao" },
  setVariable: { label: "Definir variável", category: "dados" },
  log: { label: "Anotar no histórico", category: "dados" },
};

export const BLOCK_ORDER: BlockKind[] = [
  "if",
  "repeat",
  "while",
  "wait",
  "turn",
  "light",
  "setNumber",
  "cameraPrivacy",
  "setVariable",
  "log",
  "stop",
];

export function newBlockId(): string {
  return `b-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

export const LITERAL = (value: string | number | boolean): Value => ({ kind: "literal", value });

export function defaultCondition(): Condition {
  return { kind: "compare", left: { kind: "entityState", entityId: "" }, op: "==", right: LITERAL("on") };
}

export function defaultTrigger(kind: Trigger["kind"]): Trigger {
  switch (kind) {
    case "state":
      return { kind: "state", entityId: "" };
    case "time":
      return { kind: "time", at: "07:00" };
    case "interval":
      return { kind: "interval", everyMinutes: 30 };
    case "manual":
      return { kind: "manual" };
  }
}

export function createBlock(kind: BlockKind): Block {
  const id = newBlockId();
  switch (kind) {
    case "if":
      return { id, kind, condition: defaultCondition(), then: [], otherwise: [] };
    case "repeat":
      return { id, kind, times: LITERAL(3), body: [] };
    case "while":
      return { id, kind, condition: defaultCondition(), body: [] };
    case "wait":
      return { id, kind, seconds: LITERAL(5) };
    case "turn":
      return { id, kind, entityIds: [], on: true };
    case "light":
      return {
        id,
        kind,
        entityIds: [],
        mode: "color",
        color: "#ffcc88",
        kelvin: LITERAL(WARM_WHITE_KELVIN),
        brightnessPct: LITERAL(80),
      };
    case "setNumber":
      return { id, kind, entityId: "", value: LITERAL(0) };
    case "cameraPrivacy":
      return { id, kind, cameraId: "", enabled: true };
    case "setVariable":
      return { id, kind, name: "contador", value: LITERAL(0) };
    case "log":
      return { id, kind, message: "" };
    case "stop":
      return { id, kind };
  }
}

/**
 * Cópia profunda com ids novos em toda a subárvore. Reaproveitar os ids
 * originais faria o clone e o original responderem juntos a editar/mover/
 * remover, já que essas operações acham o bloco pelo id.
 */
export function cloneBlock(block: Block): Block {
  const copy = { ...block, id: newBlockId() };

  if (copy.kind === "if") {
    return { ...copy, then: copy.then.map(cloneBlock), otherwise: copy.otherwise.map(cloneBlock) };
  }
  if (copy.kind === "repeat" || copy.kind === "while") {
    return { ...copy, body: copy.body.map(cloneBlock) };
  }
  return copy;
}

/** Insere uma cópia logo abaixo do bloco original, na mesma lista em que ele está. */
export function duplicateBlock(blocks: Block[], id: string): Block[] {
  const index = blocks.findIndex((block) => block.id === id);
  if (index !== -1) {
    const next = [...blocks];
    next.splice(index + 1, 0, cloneBlock(blocks[index]));
    return next;
  }

  return blocks.map((block) => {
    if (block.kind === "if") {
      return {
        ...block,
        then: duplicateBlock(block.then, id),
        otherwise: duplicateBlock(block.otherwise, id),
      };
    }
    if (block.kind === "repeat" || block.kind === "while") {
      return { ...block, body: duplicateBlock(block.body, id) };
    }
    return block;
  });
}

/** Substitui um bloco na árvore pelo id, descendo nos filhos. Usado por todo
 * editor de campo, para não precisar carregar o caminho até o bloco. */
export function replaceBlock(blocks: Block[], id: string, next: Block): Block[] {
  return blocks.map((block) => {
    if (block.id === id) return next;
    if (block.kind === "if") {
      return {
        ...block,
        then: replaceBlock(block.then, id, next),
        otherwise: replaceBlock(block.otherwise, id, next),
      };
    }
    if (block.kind === "repeat" || block.kind === "while") {
      return { ...block, body: replaceBlock(block.body, id, next) };
    }
    return block;
  });
}

export function removeBlock(blocks: Block[], id: string): Block[] {
  return blocks
    .filter((block) => block.id !== id)
    .map((block) => {
      if (block.kind === "if") {
        return {
          ...block,
          then: removeBlock(block.then, id),
          otherwise: removeBlock(block.otherwise, id),
        };
      }
      if (block.kind === "repeat" || block.kind === "while") {
        return { ...block, body: removeBlock(block.body, id) };
      }
      return block;
    });
}

/** Move um bloco uma posição para cima/baixo dentro da lista onde ele está. */
export function moveBlock(blocks: Block[], id: string, delta: -1 | 1): Block[] {
  const index = blocks.findIndex((block) => block.id === id);
  if (index !== -1) {
    const target = index + delta;
    if (target < 0 || target >= blocks.length) return blocks;
    const next = [...blocks];
    [next[index], next[target]] = [next[target], next[index]];
    return next;
  }

  return blocks.map((block) => {
    if (block.kind === "if") {
      return {
        ...block,
        then: moveBlock(block.then, id, delta),
        otherwise: moveBlock(block.otherwise, id, delta),
      };
    }
    if (block.kind === "repeat" || block.kind === "while") {
      return { ...block, body: moveBlock(block.body, id, delta) };
    }
    return block;
  });
}

/** Insere no fim da lista identificada por `parentId` + `slot` (raiz quando
 * `parentId` é nulo). */
export function appendBlock(
  blocks: Block[],
  parentId: string | null,
  slot: "then" | "otherwise" | "body",
  block: Block,
): Block[] {
  if (parentId === null) return [...blocks, block];

  return blocks.map((current) => {
    if (current.id === parentId) {
      if (current.kind === "if" && (slot === "then" || slot === "otherwise")) {
        return { ...current, [slot]: [...current[slot], block] };
      }
      if ((current.kind === "repeat" || current.kind === "while") && slot === "body") {
        return { ...current, body: [...current.body, block] };
      }
      return current;
    }
    if (current.kind === "if") {
      return {
        ...current,
        then: appendBlock(current.then, parentId, slot, block),
        otherwise: appendBlock(current.otherwise, parentId, slot, block),
      };
    }
    if (current.kind === "repeat" || current.kind === "while") {
      return { ...current, body: appendBlock(current.body, parentId, slot, block) };
    }
    return current;
  });
}
