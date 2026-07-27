"use client";

import { useState } from "react";
import { useAutomations } from "@/hooks/useAutomations";
import { useHaEntities } from "@/hooks/useHaEntities";
import { useTapoCameras } from "@/hooks/useTapoCameras";
import type { Automation, AutomationRunEntry } from "@/lib/automations/types";
import { cloneBlock } from "@/lib/automations/blockMeta";
import {
  AutomationEditor,
  describeTrigger,
  draftOf,
  emptyDraft,
  type AutomationDraft,
} from "./AutomationEditor";
import {
  ACCENT,
  BORDER,
  CARD_BG,
  CARD_BG_ALT,
  DANGER,
  SUCCESS,
  TEXT_MUTED_2,
  TEXT_MUTED_3,
} from "@/lib/theme";

function RunResult({ entry }: { entry: AutomationRunEntry }) {
  return (
    <div
      style={{
        background: CARD_BG_ALT,
        border: `1px solid ${BORDER}`,
        borderRadius: 10,
        padding: "10px 14px",
        fontSize: 12,
      }}
    >
      <div style={{ fontWeight: 700, color: entry.ok ? SUCCESS : DANGER, marginBottom: 4 }}>
        {entry.ok ? "Executou sem erros" : "Terminou com erro"}
      </div>
      {entry.messages.length === 0 ? (
        <div style={{ color: TEXT_MUTED_3 }}>Nenhuma anotação.</div>
      ) : (
        entry.messages.map((message, index) => (
          <div key={index} style={{ color: TEXT_MUTED_2 }}>
            · {message}
          </div>
        ))
      )}
    </div>
  );
}

export function AutomationsSection() {
  const { automations, loaded, create, update, remove, run } = useAutomations();
  const { entities } = useHaEntities();
  const { cameras } = useTapoCameras();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState<AutomationDraft>(emptyDraft());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastRun, setLastRun] = useState<AutomationRunEntry | null>(null);

  function startCreate() {
    setCreating(true);
    setEditingId(null);
    setDraft(emptyDraft());
    setError(null);
  }

  function startEdit(automation: Automation) {
    setEditingId(automation.id);
    setCreating(false);
    setDraft(draftOf(automation));
    setError(null);
  }

  function closeEditor() {
    setCreating(false);
    setEditingId(null);
    setError(null);
  }

  async function handleSave() {
    if (!draft.name.trim()) {
      setError("Dê um nome para a automação.");
      return;
    }

    setSaving(true);
    try {
      const result = editingId ? await update(editingId, draft) : await create(draft);
      if (!result.ok) {
        setError(result.error ?? "Não foi possível salvar.");
        return;
      }
      closeEditor();
    } finally {
      setSaving(false);
    }
  }

  async function handleRun(automation: Automation) {
    setLastRun(null);
    setLastRun(await run(automation.id));
  }

  /** A cópia nasce desativada de propósito: duas automações idênticas rodando
   * no mesmo gatilho quase nunca é o que se quer ao duplicar. */
  async function handleDuplicate(automation: Automation) {
    await create({
      name: `${automation.name} (cópia)`,
      enabled: false,
      trigger: automation.trigger,
      blocks: automation.blocks.map(cloneBlock),
    });
  }

  const editorOpen = creating || editingId !== null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div
        style={{
          background: CARD_BG,
          border: `1px solid ${BORDER}`,
          borderRadius: 14,
          padding: 18,
        }}
      >
        <div style={{ fontSize: 12, color: TEXT_MUTED_3, marginBottom: 14 }}>
          Cada automação começa com um bloco <strong>QUANDO</strong> e executa os blocos de cima para
          baixo. Blocos de controle (se, repetir, enquanto) têm outros blocos encaixados dentro
          deles. Tudo roda aqui no LDL, no servidor — não cria nada no Home Assistant.
        </div>

        {loaded && automations.length === 0 && (
          <div style={{ fontSize: 13, color: TEXT_MUTED_3, marginBottom: 14 }}>
            Nenhuma automação criada ainda.
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 14 }}>
          {automations.map((automation) => (
            <div
              key={automation.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                background: CARD_BG_ALT,
                border: `1px solid ${BORDER}`,
                borderRadius: 10,
                padding: "10px 14px",
              }}
            >
              <div
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: automation.enabled ? SUCCESS : "oklch(0.48 0.012 50)",
                  flexShrink: 0,
                }}
                title={automation.enabled ? "Ativa" : "Desativada"}
              />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{automation.name}</div>
                <div style={{ fontSize: 11, color: TEXT_MUTED_3 }}>
                  {describeTrigger(automation.trigger, entities)} ·{" "}
                  {automation.blocks.length} bloco{automation.blocks.length === 1 ? "" : "s"}
                </div>
              </div>
              <div
                onClick={() => handleRun(automation)}
                style={{ fontSize: 12, color: TEXT_MUTED_2, cursor: "pointer" }}
              >
                Executar agora
              </div>
              <div
                onClick={() => handleDuplicate(automation)}
                style={{ fontSize: 12, color: TEXT_MUTED_2, cursor: "pointer" }}
              >
                Duplicar
              </div>
              <div
                onClick={() => startEdit(automation)}
                style={{ fontSize: 12, color: ACCENT, cursor: "pointer" }}
              >
                Editar
              </div>
              <div
                onClick={() => remove(automation.id)}
                style={{ fontSize: 12, color: DANGER, cursor: "pointer" }}
              >
                Excluir
              </div>
            </div>
          ))}
        </div>

        {lastRun && (
          <div style={{ marginBottom: 14 }}>
            <RunResult entry={lastRun} />
          </div>
        )}

        {!editorOpen && (
          <div
            onClick={startCreate}
            style={{
              display: "inline-block",
              background: ACCENT,
              color: "oklch(0.15 0.01 50)",
              fontWeight: 700,
              fontSize: 13,
              padding: "9px 18px",
              borderRadius: 8,
              cursor: "pointer",
            }}
          >
            Nova automação
          </div>
        )}
      </div>

      {editorOpen && (
        <AutomationEditor
          draft={draft}
          onChange={setDraft}
          onSave={handleSave}
          onCancel={closeEditor}
          entities={entities}
          cameras={cameras}
          saving={saving}
          error={error}
        />
      )}
    </div>
  );
}
