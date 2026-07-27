"use client";

import { useMemo, useState } from "react";
import { useCustomDevices, type CustomDevice } from "@/hooks/useCustomDevices";
import { useDevicesByDevice, type DeviceGroup } from "@/hooks/useDevicesByDevice";
import { useHaAreas } from "@/hooks/useHaAreas";
import { friendlyName, domainOf } from "@/lib/ha/devices";
import { IconPicker } from "@/components/floorplan/IconPicker";
import { SuggestionsModal } from "@/components/SuggestionsModal";
import { RenameEntityModal } from "@/components/RenameEntityModal";
import { ACCENT, BORDER, CARD_BG, CHIP_BG, DANGER, INPUT_BG, TEXT_MUTED_3, TEXT_MUTED_4 } from "@/lib/theme";

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

const orderButtonStyle: React.CSSProperties = {
  width: 22,
  height: 22,
  borderRadius: 6,
  background: CHIP_BG,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  cursor: "pointer",
  border: "none",
  color: "inherit",
  fontSize: 12,
  lineHeight: 1,
};

interface FormState {
  name: string;
  icon: string | undefined;
  areaId: string | undefined;
  entityIds: string[];
  isSwitch: boolean;
  cameraVisibility: Record<string, boolean>;
}

const EMPTY_FORM: FormState = {
  name: "",
  icon: undefined,
  areaId: undefined,
  entityIds: [],
  isSwitch: false,
  cameraVisibility: {},
};

export function CustomDevicesSection() {
  const { devices, create, update, remove } = useCustomDevices();
  const { groups } = useDevicesByDevice();
  const { areas } = useHaAreas();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [search, setSearch] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [renamingEntityId, setRenamingEntityId] = useState<string | null>(null);

  const areaName = useMemo(() => new Map(areas.map((a) => [a.area_id, a.name])), [areas]);
  const entityLookup = useMemo(
    () => new Map(groups.flatMap((g) => g.entities).map((d) => [d.entity.entity_id, d])),
    [groups],
  );

  // Sugere um dispositivo pronto para cada dispositivo real do HA que ainda não
  // tem nenhuma entidade aproveitada em algum dispositivo já criado — assim as
  // entidades que já vêm juntas lá no HA (ex: uma impressora, uma tomada com
  // sensores) viram um card com um clique, mas o usuário ainda edita tudo antes
  // de confirmar (mesmo formulário de baixo).
  const usedEntityIds = useMemo(() => new Set(devices.flatMap((d) => d.entityIds)), [devices]);
  const suggestions = useMemo(
    () =>
      groups.filter(
        (g) => g.isDevice && g.entities.length > 0 && g.entities.every((d) => !usedEntityIds.has(d.entity.entity_id)),
      ),
    [groups, usedEntityIds],
  );

  function applySuggestion(group: DeviceGroup) {
    const cameraVisibility: Record<string, boolean> = {};
    for (const d of group.entities) {
      if (domainOf(d.entity.entity_id) === "camera") cameraVisibility[d.entity.entity_id] = true;
    }
    setEditingId(null);
    setForm({
      name: group.name,
      icon: undefined,
      areaId: group.areaId ?? undefined,
      entityIds: group.entities.map((d) => d.entity.entity_id),
      isSwitch: false,
      cameraVisibility,
    });
    setError(null);
    setSearch("");
    setShowSuggestions(false);
  }

  function startEdit(device: CustomDevice) {
    setEditingId(device.id);
    setForm({
      name: device.name,
      icon: device.icon,
      areaId: device.areaId,
      entityIds: [...device.entityIds],
      isSwitch: device.isSwitch ?? false,
      cameraVisibility: { ...(device.cameraVisibility ?? {}) },
    });
    setError(null);
    setSearch("");
  }

  function cancelEdit() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setError(null);
    setSearch("");
  }

  function toggleEntity(entityId: string) {
    setForm((prev) => {
      const has = prev.entityIds.includes(entityId);
      if (has) {
        const restVisibility = { ...prev.cameraVisibility };
        delete restVisibility[entityId];
        return {
          ...prev,
          entityIds: prev.entityIds.filter((id) => id !== entityId),
          cameraVisibility: restVisibility,
        };
      }
      const isCamera = domainOf(entityId) === "camera";
      return {
        ...prev,
        entityIds: [...prev.entityIds, entityId],
        cameraVisibility: isCamera ? { ...prev.cameraVisibility, [entityId]: true } : prev.cameraVisibility,
      };
    });
  }

  function setCameraVisible(entityId: string, visible: boolean) {
    setForm((prev) => ({ ...prev, cameraVisibility: { ...prev.cameraVisibility, [entityId]: visible } }));
  }

  function moveEntity(index: number, delta: -1 | 1) {
    setForm((prev) => {
      const next = [...prev.entityIds];
      const target = index + delta;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return { ...prev, entityIds: next };
    });
  }

  const filteredGroups = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return groups;
    return groups
      .map((g) => ({
        ...g,
        entities: g.entities.filter(
          (d) =>
            friendlyName(d.entity).toLowerCase().includes(q) ||
            d.entity.entity_id.toLowerCase().includes(q) ||
            g.name.toLowerCase().includes(q),
        ),
      }))
      .filter((g) => g.entities.length > 0);
  }, [groups, search]);

  async function handleSubmit() {
    setError(null);
    if (!form.name.trim()) {
      setError("Nome é obrigatório.");
      return;
    }
    if (form.entityIds.length === 0) {
      setError("Selecione ao menos uma entidade.");
      return;
    }

    setBusy(true);
    try {
      const input = {
        name: form.name.trim(),
        icon: form.icon,
        areaId: form.areaId,
        entityIds: form.entityIds,
        isSwitch: form.isSwitch,
        cameraVisibility: form.cameraVisibility,
      };
      const result = editingId ? await update(editingId, input) : await create(input);
      if (!result.ok) {
        setError(result.error ?? "Não foi possível salvar o dispositivo.");
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
      <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 6 }}>Dispositivos</div>
      <div style={{ fontSize: 12, color: TEXT_MUTED_3, marginBottom: 16 }}>
        Monte os cards que aparecem na página Cômodos: dê um nome, escolha um ícone e junte
        uma ou mais entidades reais do Home Assistant (ex: o switch, o sensor de temperatura e o
        modo de um ar-condicionado, tudo num card só).
      </div>

      {devices.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 20 }}>
          {devices.map((device) => (
            <div
              key={device.id}
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
              {device.icon ? (
                // eslint-disable-next-line @next/next/no-img-element -- small icon from user-managed icon library
                <img
                  src={device.icon}
                  alt=""
                  style={{ width: 24, height: 24, objectFit: "contain", flexShrink: 0 }}
                />
              ) : (
                <div
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: 6,
                    background: "oklch(0.36 0.016 50)",
                    flexShrink: 0,
                  }}
                />
              )}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{device.name}</div>
                <div style={{ fontSize: 11, color: TEXT_MUTED_3 }}>
                  {device.isSwitch ? "Interruptor · " : ""}
                  {device.entityIds.length} entidade{device.entityIds.length === 1 ? "" : "s"}
                  {device.areaId && areaName.get(device.areaId)
                    ? ` · ${areaName.get(device.areaId)}`
                    : ""}
                </div>
              </div>
              <div onClick={() => startEdit(device)} style={{ fontSize: 12, color: ACCENT, cursor: "pointer" }}>
                Editar
              </div>
              <div
                onClick={() => handleDelete(device.id)}
                style={{ fontSize: 12, color: DANGER, cursor: "pointer" }}
              >
                Excluir
              </div>
            </div>
          ))}
        </div>
      )}

      {suggestions.length > 0 && (
        <div
          onClick={() => setShowSuggestions(true)}
          style={{ fontSize: 13, color: ACCENT, cursor: "pointer", marginBottom: 20 }}
        >
          {suggestions.length} dispositivo{suggestions.length === 1 ? "" : "s"} sugerido
          {suggestions.length === 1 ? "" : "s"}
        </div>
      )}

      {showSuggestions && (
        <SuggestionsModal
          suggestions={suggestions}
          onUse={applySuggestion}
          onClose={() => setShowSuggestions(false)}
        />
      )}

      <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10 }}>
        {editingId ? "Editar dispositivo" : "Criar dispositivo"}
      </div>

      <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 14 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 4, width: 200 }}>
          <label style={fieldLabel}>Nome</label>
          <input
            style={inputStyle}
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Ar da sala"
          />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 4, width: 180 }}>
          <label style={fieldLabel}>Área (opcional)</label>
          <select
            style={inputStyle}
            value={form.areaId ?? ""}
            onChange={(e) => setForm({ ...form, areaId: e.target.value || undefined })}
          >
            <option value="">Sem área</option>
            {areas.map((a) => (
              <option key={a.area_id} value={a.area_id}>
                {a.name}
              </option>
            ))}
          </select>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 4, width: 220 }}>
          <label style={fieldLabel}>Ícone (opcional)</label>
          <IconPicker value={form.icon} onSelect={(url) => setForm({ ...form, icon: url })} />
        </div>
      </div>

      <label
        style={{
          display: "flex",
          alignItems: "flex-start",
          gap: 8,
          fontSize: 13,
          cursor: "pointer",
          marginBottom: 16,
        }}
      >
        <input
          type="checkbox"
          checked={form.isSwitch}
          onChange={(e) => setForm({ ...form, isSwitch: e.target.checked })}
          style={{ marginTop: 2 }}
        />
        <span>
          Este dispositivo é um interruptor
          <span style={{ display: "block", fontSize: 11, color: TEXT_MUTED_3 }}>
            Em vez de mostrar cada entidade separada, o card mostra um único Ligado/Desligado —
            acionar liga ou desliga todas as entidades juntas.
          </span>
        </span>
      </label>

      {form.entityIds.length > 0 && (
        <div style={{ marginBottom: 14 }}>
          <label style={fieldLabel}>Ordem das entidades no card</label>
          <div
            style={{
              marginTop: 6,
              display: "flex",
              flexDirection: "column",
              gap: 4,
              background: "oklch(0.30 0.015 50)",
              border: `1px solid ${BORDER}`,
              borderRadius: 8,
              padding: 8,
            }}
          >
            {form.entityIds.map((entityId, index) => {
              const d = entityLookup.get(entityId);
              const isCamera = domainOf(entityId) === "camera";
              return (
                <div key={entityId} style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  <button
                    type="button"
                    onClick={() => moveEntity(index, -1)}
                    disabled={index === 0}
                    style={{ ...orderButtonStyle, opacity: index === 0 ? 0.35 : 1 }}
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    onClick={() => moveEntity(index, 1)}
                    disabled={index === form.entityIds.length - 1}
                    style={{ ...orderButtonStyle, opacity: index === form.entityIds.length - 1 ? 0.35 : 1 }}
                  >
                    ↓
                  </button>
                  <span style={{ fontSize: 13, flex: 1, minWidth: 0 }}>
                    {d ? friendlyName(d.entity) : entityId}
                  </span>
                  <span style={{ fontSize: 11, color: TEXT_MUTED_4 }}>{d?.config.typeLabel}</span>
                  {isCamera && (
                    <label
                      style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: TEXT_MUTED_3, cursor: "pointer" }}
                    >
                      <input
                        type="checkbox"
                        checked={form.cameraVisibility[entityId] ?? false}
                        onChange={(e) => setCameraVisible(entityId, e.target.checked)}
                      />
                      Mostrar em Câmeras
                    </label>
                  )}
                  <div
                    onClick={() => setRenamingEntityId(entityId)}
                    style={{ fontSize: 11, color: ACCENT, cursor: "pointer", padding: "2px 6px" }}
                  >
                    Editar
                  </div>
                  <div
                    onClick={() => toggleEntity(entityId)}
                    style={{ fontSize: 11, color: DANGER, cursor: "pointer", padding: "2px 6px" }}
                  >
                    Remover
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div style={{ marginBottom: 10 }}>
        <label style={fieldLabel}>Adicionar entidades</label>
        <input
          style={{ ...inputStyle, marginTop: 4, marginBottom: 10 }}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por nome ou dispositivo..."
        />
        <div
          style={{
            maxHeight: 320,
            overflowY: "auto",
            display: "flex",
            flexDirection: "column",
            gap: 14,
            paddingRight: 4,
          }}
        >
          {filteredGroups.map((group) => (
            <div key={group.groupId}>
              <div style={{ fontSize: 12, fontWeight: 600, color: TEXT_MUTED_3, marginBottom: 6 }}>
                {group.name}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                {group.entities.map((d) => (
                  <div key={d.entity.entity_id} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, cursor: "pointer", flex: 1, minWidth: 0 }}>
                      <input
                        type="checkbox"
                        checked={form.entityIds.includes(d.entity.entity_id)}
                        onChange={() => toggleEntity(d.entity.entity_id)}
                      />
                      <span>{friendlyName(d.entity)}</span>
                      <span style={{ fontSize: 11, color: TEXT_MUTED_3 }}>{d.config.typeLabel}</span>
                    </label>
                    <div
                      onClick={() => setRenamingEntityId(d.entity.entity_id)}
                      style={{ fontSize: 11, color: ACCENT, cursor: "pointer", flexShrink: 0 }}
                    >
                      Editar
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
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
          {editingId ? "Salvar alterações" : "Criar dispositivo"}
        </div>
        {editingId && (
          <div onClick={cancelEdit} style={{ fontSize: 12, color: TEXT_MUTED_3, cursor: "pointer" }}>
            Cancelar
          </div>
        )}
      </div>

      {renamingEntityId && (
        <RenameEntityModal
          entityId={renamingEntityId}
          currentName={
            entityLookup.get(renamingEntityId)
              ? friendlyName(entityLookup.get(renamingEntityId)!.entity)
              : renamingEntityId
          }
          onClose={() => setRenamingEntityId(null)}
        />
      )}
    </div>
  );
}
