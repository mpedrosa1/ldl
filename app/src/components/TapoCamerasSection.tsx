"use client";

import { useState } from "react";
import { useTapoCameras, type TapoCameraPublic } from "@/hooks/useTapoCameras";
import { ACCENT, BORDER, CARD_BG, DANGER, INPUT_BG, TEXT_MUTED_2, TEXT_MUTED_3 } from "@/lib/theme";

const inputStyle: React.CSSProperties = {
  background: INPUT_BG,
  border: "1px solid oklch(0.38 0.017 50)",
  borderRadius: 6,
  padding: "8px 10px",
  color: "oklch(0.94 0.006 50)",
  fontSize: 13,
  width: "100%",
  boxSizing: "border-box",
};

const fieldLabel: React.CSSProperties = { fontSize: 11, color: TEXT_MUTED_3 };

interface FormState {
  name: string;
  host: string;
  username: string;
  password: string;
}

const EMPTY_FORM: FormState = { name: "", host: "", username: "", password: "" };

export function TapoCamerasSection() {
  const { cameras, create, update, remove } = useTapoCameras();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function startEdit(camera: TapoCameraPublic) {
    setEditingId(camera.id);
    setForm({ name: camera.name, host: camera.host, username: camera.username, password: "" });
    setError(null);
  }

  function cancelEdit() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setError(null);
  }

  async function handleSubmit() {
    setError(null);
    if (!form.name.trim() || !form.host.trim() || !form.username) {
      setError("Preencha nome, IP e usuário.");
      return;
    }
    if (!editingId && !form.password) {
      setError("Senha é obrigatória para uma nova câmera.");
      return;
    }

    setBusy(true);
    try {
      const result = editingId
        ? await update(editingId, form)
        : await create({ ...form, password: form.password });
      if (!result.ok) {
        setError(result.error ?? "Não foi possível salvar a câmera.");
        return;
      }
      cancelEdit();
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete(id: string) {
    setBusy(true);
    try {
      await remove(id);
      if (editingId === id) cancelEdit();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      style={{
        background: CARD_BG,
        border: `1px solid ${BORDER}`,
        borderRadius: 16,
        padding: 20,
      }}
    >
      <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 6 }}>Câmeras Tapo</div>
      <div style={{ fontSize: 12, color: TEXT_MUTED_3, marginBottom: 16 }}>
        Conecta direto na câmera via RTSP local, sem precisar do Home Assistant. No app Tapo,
        habilite em Configurações avançadas → Conta da câmera, e use esse usuário/senha aqui
        (não é sua conta TP-Link/cloud).
      </div>

      {cameras.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
          {cameras.map((camera) => (
            <div
              key={camera.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                background: "oklch(0.30 0.015 50)",
                border: `1px solid ${BORDER}`,
                borderRadius: 10,
                padding: "10px 14px",
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{camera.name}</div>
                <div style={{ fontSize: 11, color: TEXT_MUTED_3 }}>
                  {camera.host} · usuário {camera.username}
                </div>
              </div>
              <div onClick={() => startEdit(camera)} style={{ fontSize: 12, color: ACCENT, cursor: "pointer" }}>
                Editar
              </div>
              <div
                onClick={() => handleDelete(camera.id)}
                style={{ fontSize: 12, color: DANGER, cursor: "pointer" }}
              >
                Excluir
              </div>
            </div>
          ))}
        </div>
      )}

      <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10 }}>
        {editingId ? "Editar câmera" : "Adicionar câmera"}
      </div>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 10 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 4, width: 180 }}>
          <label style={fieldLabel}>Nome</label>
          <input
            style={inputStyle}
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Câmera da sala"
          />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 4, width: 160 }}>
          <label style={fieldLabel}>IP / host</label>
          <input
            style={inputStyle}
            value={form.host}
            onChange={(e) => setForm({ ...form, host: e.target.value })}
            placeholder="192.168.1.50"
          />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 4, width: 140 }}>
          <label style={fieldLabel}>Usuário (conta de câmera)</label>
          <input
            style={inputStyle}
            value={form.username}
            onChange={(e) => setForm({ ...form, username: e.target.value })}
          />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 4, width: 160 }}>
          <label style={fieldLabel}>
            Senha {editingId ? "(deixe em branco p/ manter)" : ""}
          </label>
          <input
            style={inputStyle}
            type="password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
          />
        </div>
      </div>
      <div style={{ fontSize: 11, color: TEXT_MUTED_3, marginTop: -4, marginBottom: 10 }}>
        A qualidade (HD/SD) do vídeo ao vivo é escolhida na própria página de Câmeras.
      </div>

      {error && <div style={{ fontSize: 12, color: DANGER, marginBottom: 10 }}>{error}</div>}

      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
        <div
          onClick={busy ? undefined : handleSubmit}
          style={{
            background: ACCENT,
            color: "oklch(0.15 0.01 50)",
            fontWeight: 700,
            fontSize: 13,
            padding: "9px 18px",
            borderRadius: 8,
            cursor: busy ? "default" : "pointer",
            opacity: busy ? 0.6 : 1,
          }}
        >
          {editingId ? "Salvar alterações" : "Adicionar câmera"}
        </div>
        {editingId && (
          <div onClick={cancelEdit} style={{ fontSize: 12, color: TEXT_MUTED_2, cursor: "pointer" }}>
            Cancelar
          </div>
        )}
      </div>
    </div>
  );
}
