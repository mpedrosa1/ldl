"use client";

import type { HassEntity } from "home-assistant-js-websocket";
import type { TapoCameraPublic } from "@/hooks/useTapoCameras";
import type { Automation, Block, Trigger } from "@/lib/automations/types";
import {
  appendBlock,
  defaultTrigger,
  duplicateBlock,
  moveBlock,
  removeBlock,
  replaceBlock,
  TRIGGER_COLOR,
} from "@/lib/automations/blockMeta";
import { BlockList } from "./BlockList";
import { EntitySelect, Input, Select, Word } from "./AutomationFields";
import {
  ACCENT,
  BORDER,
  BORDER_STRONG,
  CARD_BG,
  DANGER,
  INPUT_BG,
  TEXT,
  TEXT_MUTED_2,
  TEXT_MUTED_3,
} from "@/lib/theme";

const TRIGGER_OPTIONS = [
  { value: "state", label: "uma entidade mudar de estado" },
  { value: "time", label: "chegar um horário" },
  { value: "interval", label: "passar um intervalo" },
  { value: "manual", label: "eu mandar executar" },
];

export interface AutomationDraft {
  name: string;
  enabled: boolean;
  trigger: Trigger;
  blocks: Block[];
}

export function AutomationEditor({
  draft,
  onChange,
  onSave,
  onCancel,
  entities,
  cameras,
  saving,
  error,
}: {
  draft: AutomationDraft;
  onChange: (draft: AutomationDraft) => void;
  onSave: () => void;
  onCancel: () => void;
  entities: HassEntity[];
  cameras: TapoCameraPublic[];
  saving: boolean;
  error: string | null;
}) {
  const { trigger } = draft;

  return (
    <div
      style={{
        background: CARD_BG,
        border: `1px solid ${BORDER}`,
        borderRadius: 14,
        padding: 18,
        display: "flex",
        flexDirection: "column",
        gap: 14,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <input
          value={draft.name}
          onChange={(e) => onChange({ ...draft, name: e.target.value })}
          placeholder="Nome da automação"
          style={{
            background: INPUT_BG,
            border: `1px solid ${BORDER_STRONG}`,
            borderRadius: 8,
            padding: "8px 12px",
            color: TEXT,
            fontSize: 15,
            fontWeight: 600,
            flex: 1,
            minWidth: 200,
          }}
        />
        <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: TEXT_MUTED_3 }}>
          <input
            type="checkbox"
            checked={draft.enabled}
            onChange={(e) => onChange({ ...draft, enabled: e.target.checked })}
          />
          Ativa
        </label>
      </div>

      {/* Bloco de gatilho: fica visualmente separado dos demais porque é o
          único que não é uma instrução — é a condição de partida. */}
      <div
        style={{
          background: "oklch(0.30 0.015 50)",
          borderLeft: `4px solid ${TRIGGER_COLOR}`,
          borderRadius: 8,
          padding: "10px 12px",
          display: "flex",
          alignItems: "center",
          gap: 6,
          flexWrap: "wrap",
        }}
      >
        <Word>QUANDO</Word>
        <Select
          value={trigger.kind}
          onChange={(kind) => onChange({ ...draft, trigger: defaultTrigger(kind as Trigger["kind"]) })}
          options={TRIGGER_OPTIONS}
          width={230}
        />

        {trigger.kind === "state" && (
          <>
            <EntitySelect
              value={trigger.entityId}
              onChange={(entityId) => onChange({ ...draft, trigger: { ...trigger, entityId } })}
              entities={entities}
            />
            <Word>DE</Word>
            <Input
              value={trigger.from ?? ""}
              onChange={(from) => onChange({ ...draft, trigger: { ...trigger, from: from || undefined } })}
              width={90}
              placeholder="qualquer"
            />
            <Word>PARA</Word>
            <Input
              value={trigger.to ?? ""}
              onChange={(to) => onChange({ ...draft, trigger: { ...trigger, to: to || undefined } })}
              width={90}
              placeholder="qualquer"
            />
          </>
        )}

        {trigger.kind === "time" && (
          <Input
            type="time"
            value={trigger.at}
            onChange={(at) => onChange({ ...draft, trigger: { ...trigger, at } })}
            width={100}
          />
        )}

        {trigger.kind === "interval" && (
          <>
            <Word>A CADA</Word>
            <Input
              type="number"
              value={String(trigger.everyMinutes)}
              onChange={(minutes) =>
                onChange({ ...draft, trigger: { ...trigger, everyMinutes: Math.max(Number(minutes) || 1, 1) } })
              }
              width={70}
            />
            <Word>MINUTOS</Word>
          </>
        )}
      </div>

      <div>
        <div style={{ fontSize: 12, color: TEXT_MUTED_3, marginBottom: 8 }}>
          Faça o seguinte, de cima para baixo:
        </div>
        <BlockList
          blocks={draft.blocks}
          entities={entities}
          cameras={cameras}
          parentId={null}
          slot="body"
          onChangeBlock={(id, next) => onChange({ ...draft, blocks: replaceBlock(draft.blocks, id, next) })}
          onRemove={(id) => onChange({ ...draft, blocks: removeBlock(draft.blocks, id) })}
          onDuplicate={(id) => onChange({ ...draft, blocks: duplicateBlock(draft.blocks, id) })}
          onMove={(id, delta) => onChange({ ...draft, blocks: moveBlock(draft.blocks, id, delta) })}
          onAdd={(parentId, slot, block) =>
            onChange({ ...draft, blocks: appendBlock(draft.blocks, parentId, slot, block) })
          }
        />
      </div>

      {error && <div style={{ fontSize: 12, color: DANGER }}>{error}</div>}

      <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
        <div
          onClick={saving ? undefined : onSave}
          style={{
            background: ACCENT,
            color: "oklch(0.15 0.01 50)",
            fontWeight: 700,
            fontSize: 13,
            padding: "9px 18px",
            borderRadius: 8,
            cursor: saving ? "default" : "pointer",
            opacity: saving ? 0.6 : 1,
          }}
        >
          Salvar automação
        </div>
        <div onClick={onCancel} style={{ fontSize: 12, color: TEXT_MUTED_2, cursor: "pointer" }}>
          Cancelar
        </div>
      </div>
    </div>
  );
}

export function emptyDraft(): AutomationDraft {
  return { name: "", enabled: true, trigger: defaultTrigger("state"), blocks: [] };
}

export function draftOf(automation: Automation): AutomationDraft {
  return {
    name: automation.name,
    enabled: automation.enabled,
    trigger: automation.trigger,
    blocks: automation.blocks,
  };
}

/** Frase curta que resume o gatilho, para a lista de automações. */
export function describeTrigger(trigger: Trigger, entities: HassEntity[]): string {
  switch (trigger.kind) {
    case "state": {
      const entity = entities.find((e) => e.entity_id === trigger.entityId);
      const name = entity?.attributes.friendly_name ?? trigger.entityId ?? "—";
      const to = trigger.to ? ` para "${trigger.to}"` : "";
      return `quando ${name} mudar${to}`;
    }
    case "time":
      return `todo dia às ${trigger.at}`;
    case "interval":
      return `a cada ${trigger.everyMinutes} min`;
    case "manual":
      return "só manualmente";
  }
}
