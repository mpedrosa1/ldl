"use client";

import { useState } from "react";
import type { HassEntity } from "home-assistant-js-websocket";
import type { TapoCameraPublic } from "@/hooks/useTapoCameras";
import type { Block, Value } from "@/lib/automations/types";
import { BLOCK_META, BLOCK_ORDER, CATEGORY_COLOR, createBlock, LITERAL } from "@/lib/automations/blockMeta";
import {
  COOL_WHITE_KELVIN,
  PRESET_TOLERANCE_KELVIN,
  WARM_WHITE_KELVIN,
  lightKelvinRange,
} from "@/lib/ha/lightColor";
import { ConditionEditor, EntityMultiSelect, EntitySelect, Input, Select, ValueEditor, Word } from "./AutomationFields";
import { ACCENT, BORDER_STRONG, CARD_BG_ALT, TEXT_MUTED_3 } from "@/lib/theme";

export interface BlockListProps {
  blocks: Block[];
  entities: HassEntity[];
  cameras: TapoCameraPublic[];
  onChangeBlock: (id: string, next: Block) => void;
  onRemove: (id: string) => void;
  onDuplicate: (id: string) => void;
  onMove: (id: string, delta: -1 | 1) => void;
  onAdd: (parentId: string | null, slot: "then" | "otherwise" | "body", block: Block) => void;
  /** Lista a que estes blocos pertencem — o "+ bloco" precisa saber onde inserir. */
  parentId: string | null;
  slot: "then" | "otherwise" | "body";
}

function AddBlockButton({ onPick }: { onPick: (block: Block) => void }) {
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <div
        onClick={() => setOpen(true)}
        style={{
          fontSize: 12,
          fontWeight: 600,
          color: TEXT_MUTED_3,
          cursor: "pointer",
          padding: "6px 2px",
        }}
      >
        + adicionar bloco
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 6, padding: "6px 0" }}>
      {BLOCK_ORDER.map((kind) => (
        <div
          key={kind}
          onClick={() => {
            onPick(createBlock(kind));
            setOpen(false);
          }}
          style={{
            fontSize: 11,
            fontWeight: 700,
            color: "oklch(0.15 0.01 50)",
            background: CATEGORY_COLOR[BLOCK_META[kind].category],
            padding: "5px 10px",
            borderRadius: 999,
            cursor: "pointer",
          }}
        >
          {BLOCK_META[kind].label}
        </div>
      ))}
      <div
        onClick={() => setOpen(false)}
        style={{ fontSize: 11, color: TEXT_MUTED_3, cursor: "pointer", padding: "5px 6px" }}
      >
        cancelar
      </div>
    </div>
  );
}

/** Atalho para os brancos usuais, já clampados na faixa real da lâmpada —
 * é o equivalente aos botões "Branco quente/frio" dos cards de Cômodos. */
function WhitePreset({
  label,
  kelvin,
  active,
  onPick,
}: {
  label: string;
  kelvin: number;
  active: boolean;
  onPick: (kelvin: number) => void;
}) {
  return (
    <span
      className="ldl-chip"
      onClick={() => onPick(kelvin)}
      title={`${kelvin}K`}
      style={{
        fontSize: 11,
        fontWeight: 700,
        border: `1px solid ${active ? ACCENT : BORDER_STRONG}`,
        // Sem fundo inline quando inativo: estilo inline venceria a regra
        // `.ldl-chip:hover` e o hover não teria efeito nenhum.
        background: active ? "oklch(0.78 0.15 75 / 0.16)" : undefined,
        color: active ? ACCENT : undefined,
        borderRadius: 999,
        padding: "3px 9px",
        cursor: "pointer",
        whiteSpace: "nowrap",
      }}
    >
      {label}
    </span>
  );
}

/** Só dá para destacar um preset quando o kelvin é um número fixo — se o
 * usuário apontou para uma variável ou conta, o valor só existe na execução. */
function activePreset(kelvin: Value | undefined, target: number): boolean {
  if (!kelvin || kelvin.kind !== "literal") return false;
  const current = Number(kelvin.value);
  return Number.isFinite(current) && Math.abs(current - target) <= PRESET_TOLERANCE_KELVIN;
}

/** Área encaixada dentro de um bloco de controle (o "C" do Scratch). */
function Slot({
  label,
  blocks,
  parentId,
  slot,
  color,
  shared,
}: {
  label?: string;
  blocks: Block[];
  parentId: string;
  slot: "then" | "otherwise" | "body";
  color: string;
  shared: Omit<BlockListProps, "blocks" | "parentId" | "slot">;
}) {
  return (
    <div style={{ marginTop: 6 }}>
      {label && (
        <div style={{ fontSize: 11, fontWeight: 700, opacity: 0.75, marginBottom: 4 }}>{label}</div>
      )}
      <div style={{ borderLeft: `3px solid ${color}`, paddingLeft: 12, marginLeft: 2 }}>
        <BlockList {...shared} blocks={blocks} parentId={parentId} slot={slot} />
      </div>
    </div>
  );
}

function BlockBody({
  block,
  entities,
  cameras,
  onChange,
  shared,
}: {
  block: Block;
  entities: HassEntity[];
  cameras: TapoCameraPublic[];
  onChange: (next: Block) => void;
  shared: Omit<BlockListProps, "blocks" | "parentId" | "slot">;
}) {
  const color = CATEGORY_COLOR[BLOCK_META[block.kind].category];

  switch (block.kind) {
    case "if":
      return (
        <>
          <Word>SE</Word>{" "}
          <ConditionEditor
            condition={block.condition}
            onChange={(condition) => onChange({ ...block, condition })}
            entities={entities}
          />
          <Slot label="ENTÃO" blocks={block.then} parentId={block.id} slot="then" color={color} shared={shared} />
          <Slot
            label="SENÃO"
            blocks={block.otherwise}
            parentId={block.id}
            slot="otherwise"
            color={color}
            shared={shared}
          />
        </>
      );

    case "repeat":
      return (
        <>
          <Word>REPETIR</Word>{" "}
          <ValueEditor value={block.times} onChange={(times) => onChange({ ...block, times })} entities={entities} />{" "}
          <Word>VEZES</Word>
          <Slot blocks={block.body} parentId={block.id} slot="body" color={color} shared={shared} />
        </>
      );

    case "while":
      return (
        <>
          <Word>ENQUANTO</Word>{" "}
          <ConditionEditor
            condition={block.condition}
            onChange={(condition) => onChange({ ...block, condition })}
            entities={entities}
          />
          <Slot blocks={block.body} parentId={block.id} slot="body" color={color} shared={shared} />
        </>
      );

    case "wait":
      return (
        <>
          <Word>ESPERAR</Word>{" "}
          <ValueEditor
            value={block.seconds}
            onChange={(seconds) => onChange({ ...block, seconds })}
            entities={entities}
          />{" "}
          <Word>SEGUNDOS</Word>
        </>
      );

    case "turn":
      return (
        <>
          <Select
            value={block.on ? "on" : "off"}
            onChange={(v) => onChange({ ...block, on: v === "on" })}
            options={[
              { value: "on", label: "LIGAR" },
              { value: "off", label: "DESLIGAR" },
            ]}
            width={100}
          />{" "}
          <EntityMultiSelect
            values={block.entityIds}
            onChange={(entityIds) => onChange({ ...block, entityIds })}
            entities={entities}
          />
        </>
      );

    case "light": {
      const mode = block.mode ?? "color";
      // Faixa de kelvin da primeira lâmpada escolhida — é a mesma referência
      // que o motor usa na hora de executar.
      const reference = entities.find((e) => e.entity_id === block.entityIds[0]);
      const [minK, maxK] = lightKelvinRange(reference);
      const warm = Math.max(minK, WARM_WHITE_KELVIN);
      const cool = Math.min(maxK, COOL_WHITE_KELVIN);

      return (
        <>
          <Word>LUZ</Word>{" "}
          <EntityMultiSelect
            values={block.entityIds}
            onChange={(entityIds) => onChange({ ...block, entityIds })}
            entities={entities}
            domains={["light"]}
          />{" "}
          <Select
            value={mode}
            onChange={(next) =>
              onChange(
                next === "temp"
                  ? // Semeia o valor mostrado na tela: sem isso o campo exibiria
                    // o padrão mas nada ficaria gravado até o usuário mexer nele.
                    { ...block, mode: "temp", kelvin: block.kelvin ?? LITERAL(warm) }
                  : { ...block, mode: "color", color: block.color ?? "#ffffff" },
              )
            }
            options={[
              { value: "color", label: "COR" },
              { value: "temp", label: "BRANCO" },
            ]}
            width={95}
          />{" "}
          {mode === "color" ? (
            <input
              type="color"
              value={block.color ?? "#ffffff"}
              onChange={(e) => onChange({ ...block, color: e.target.value })}
              style={{ width: 34, height: 24, padding: 0, border: "none", background: "none", cursor: "pointer" }}
            />
          ) : (
            <>
              <WhitePreset
                label="quente"
                kelvin={warm}
                active={activePreset(block.kelvin, warm)}
                onPick={(k) => onChange({ ...block, kelvin: LITERAL(k) })}
              />
              <WhitePreset
                label="frio"
                kelvin={cool}
                active={activePreset(block.kelvin, cool)}
                onPick={(k) => onChange({ ...block, kelvin: LITERAL(k) })}
              />
              <ValueEditor
                value={block.kelvin ?? LITERAL(warm)}
                onChange={(kelvin) => onChange({ ...block, kelvin })}
                entities={entities}
              />
              <Word>K</Word>
            </>
          )}{" "}
          <Word>BRILHO %</Word>{" "}
          <ValueEditor
            value={block.brightnessPct ?? LITERAL(100)}
            onChange={(brightnessPct) => onChange({ ...block, brightnessPct })}
            entities={entities}
          />
        </>
      );
    }

    case "setNumber":
      return (
        <>
          <Word>DEFINIR</Word>{" "}
          <EntitySelect
            value={block.entityId}
            onChange={(entityId) => onChange({ ...block, entityId })}
            entities={entities}
            domains={["number"]}
          />{" "}
          <Word>COMO</Word>{" "}
          <ValueEditor value={block.value} onChange={(value) => onChange({ ...block, value })} entities={entities} />
        </>
      );

    case "cameraPrivacy":
      return (
        <>
          <Select
            value={block.enabled ? "on" : "off"}
            onChange={(v) => onChange({ ...block, enabled: v === "on" })}
            options={[
              { value: "on", label: "ATIVAR" },
              { value: "off", label: "DESATIVAR" },
            ]}
            width={110}
          />{" "}
          <Word>PRIVACIDADE DA CÂMERA</Word>{" "}
          <Select
            value={block.cameraId}
            onChange={(cameraId) => onChange({ ...block, cameraId })}
            options={[
              { value: "", label: "escolher…" },
              ...cameras.map((camera) => ({ value: camera.id, label: camera.name })),
            ]}
            width={180}
          />
        </>
      );

    case "setVariable":
      return (
        <>
          <Word>VARIÁVEL</Word>{" "}
          <Input value={block.name} onChange={(name) => onChange({ ...block, name })} width={130} placeholder="nome" />{" "}
          <Word>RECEBE</Word>{" "}
          <ValueEditor value={block.value} onChange={(value) => onChange({ ...block, value })} entities={entities} />
        </>
      );

    case "log":
      return (
        <>
          <Word>ANOTAR</Word>{" "}
          <Input
            value={block.message}
            onChange={(message) => onChange({ ...block, message })}
            width={280}
            placeholder="texto que aparece no histórico"
          />
        </>
      );

    case "stop":
      return <Word>PARAR AUTOMAÇÃO</Word>;
  }
}

export function BlockList(props: BlockListProps) {
  const { blocks, entities, cameras, onChangeBlock, onRemove, onDuplicate, onMove, onAdd, parentId, slot } =
    props;
  const shared = { entities, cameras, onChangeBlock, onRemove, onDuplicate, onMove, onAdd };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {blocks.map((block, index) => {
        const color = CATEGORY_COLOR[BLOCK_META[block.kind].category];
        return (
          <div
            key={block.id}
            style={{
              background: CARD_BG_ALT,
              borderLeft: `4px solid ${color}`,
              borderRadius: 8,
              padding: "8px 10px",
            }}
          >
            <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
              <div style={{ flex: 1, minWidth: 0, display: "flex", alignItems: "center", gap: 5, flexWrap: "wrap" }}>
                <BlockBody
                  block={block}
                  entities={entities}
                  cameras={cameras}
                  onChange={(next) => onChangeBlock(block.id, next)}
                  shared={shared}
                />
              </div>
              <div style={{ display: "flex", gap: 2, flexShrink: 0, fontSize: 12, color: TEXT_MUTED_3 }}>
                {index > 0 && (
                  <span
                    className="ldl-block-action"
                    onClick={() => onMove(block.id, -1)}
                    title="Mover para cima"
                  >
                    ↑
                  </span>
                )}
                {index < blocks.length - 1 && (
                  <span
                    className="ldl-block-action"
                    onClick={() => onMove(block.id, 1)}
                    title="Mover para baixo"
                  >
                    ↓
                  </span>
                )}
                <span
                  className="ldl-block-action"
                  onClick={() => onDuplicate(block.id)}
                  title="Duplicar bloco (com o que estiver dentro dele)"
                >
                  ⧉
                </span>
                <span
                  className="ldl-block-action ldl-block-action-danger"
                  onClick={() => onRemove(block.id)}
                  title="Remover bloco"
                >
                  ×
                </span>
              </div>
            </div>
          </div>
        );
      })}

      <AddBlockButton onPick={(block) => onAdd(parentId, slot, block)} />
    </div>
  );
}
