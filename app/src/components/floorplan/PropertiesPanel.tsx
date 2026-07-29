"use client";

import { useMemo } from "react";
import type { HassEntity } from "home-assistant-js-websocket";
import type {
  Wall,
  Opening,
  PlacedDevice,
  FurnitureItem,
  FloorArea,
  DeviceIconType,
} from "@/lib/floorplan/types";
import { DEVICE_ICON_OPTIONS } from "@/lib/floorplan/icons";
import { useCustomDevices, type CustomDevice } from "@/hooks/useCustomDevices";
import { useHaAreas } from "@/hooks/useHaAreas";
import { useHaEntities } from "@/hooks/useHaEntities";
import { useTapoCameras } from "@/hooks/useTapoCameras";
import { cameraOptions } from "@/lib/cameras/list";
import { isControllable } from "@/lib/floorplan/deviceBinding";
import { friendlyName } from "@/lib/ha/devices";
import { resizeWallLength, wallLength } from "@/lib/floorplan/geometry";
import { FLOOR_PRESETS } from "@/lib/floorplan/floorPresets";
import { ACCENT, BORDER, CARD_BG, DANGER, INPUT_BG, TEXT_MUTED_3 } from "@/lib/theme";
import { IconPicker } from "./IconPicker";

const panelStyle: React.CSSProperties = {
  position: "absolute",
  top: 12,
  right: 12,
  width: 240,
  background: CARD_BG,
  border: `1px solid ${BORDER}`,
  borderRadius: 12,
  padding: 14,
  display: "flex",
  flexDirection: "column",
  gap: 10,
  fontSize: 13,
};

const fieldLabel: React.CSSProperties = { fontSize: 11, color: TEXT_MUTED_3 };

const inputStyle: React.CSSProperties = {
  background: INPUT_BG,
  border: "1px solid oklch(0.38 0.017 50)",
  borderRadius: 6,
  padding: "6px 8px",
  color: "oklch(0.94 0.006 50)",
  fontSize: 13,
  width: "100%",
  boxSizing: "border-box",
};

const rotateButtonStyle: React.CSSProperties = {
  width: 28,
  height: 28,
  borderRadius: 6,
  background: INPUT_BG,
  border: "1px solid oklch(0.38 0.017 50)",
  color: "oklch(0.94 0.006 50)",
  cursor: "pointer",
  fontSize: 14,
};

export function PropertiesPanel({
  wall,
  opening,
  device,
  furniture,
  floor,
  onUpdateWall,
  onUpdateOpening,
  onUpdateDevice,
  onUpdateFurniture,
  onUpdateFloor,
  onDelete,
  onClose,
}: {
  wall?: Wall;
  opening?: Opening;
  device?: PlacedDevice;
  furniture?: FurnitureItem;
  floor?: FloorArea;
  onUpdateWall: (patch: Partial<Wall>) => void;
  onUpdateOpening: (patch: Partial<Opening>) => void;
  onUpdateDevice: (patch: Partial<PlacedDevice>) => void;
  onUpdateFurniture: (patch: Partial<FurnitureItem>) => void;
  onUpdateFloor: (patch: Partial<FloorArea>) => void;
  onDelete: () => void;
  onClose: () => void;
}) {
  const { devices: customDevices } = useCustomDevices();
  const { areas, entityMeta } = useHaAreas();
  const { entities } = useHaEntities();
  const { cameras: tapoCameras } = useTapoCameras();
  const areaName = useMemo(() => new Map(areas.map((a) => [a.area_id, a.name])), [areas]);
  const cameras = useMemo(
    () => cameraOptions(customDevices, entities, tapoCameras, entityMeta),
    [customDevices, entities, tapoCameras, entityMeta],
  );

  // Entidades do dispositivo vinculado, na ordem em que o usuário as montou.
  const selectedDevice = device?.deviceId
    ? customDevices.find((d) => d.id === device.deviceId)
    : undefined;
  const deviceEntities = useMemo(() => {
    if (!selectedDevice) return [];
    return selectedDevice.entityIds
      .map((id) => entities.find((e) => e.entity_id === id))
      .filter((e): e is HassEntity => e != null);
  }, [selectedDevice, entities]);
  const controllableEntities = useMemo(
    () => deviceEntities.filter((e) => isControllable(e.entity_id)),
    [deviceEntities],
  );

  return (
    <div style={panelStyle}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ fontWeight: 600 }}>
          {wall
            ? "Parede"
            : opening
              ? opening.kind === "door"
                ? "Porta"
                : "Janela"
              : furniture
                ? "Móvel"
                : floor
                  ? "Piso"
                  : "Dispositivo"}
        </div>
        <div onClick={onClose} style={{ cursor: "pointer", color: TEXT_MUTED_3 }}>
          ✕
        </div>
      </div>

      {wall && (
        <>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <label style={fieldLabel}>Comprimento (m)</label>
            <input
              style={inputStyle}
              type="number"
              step="0.05"
              min="0.1"
              value={(wallLength(wall) / 100).toFixed(2)}
              onChange={(e) => {
                const meters = Number(e.target.value);
                if (!meters || meters <= 0) return;
                const resized = resizeWallLength(wall, meters * 100);
                onUpdateWall({ x2: resized.x2, y2: resized.y2 });
              }}
            />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <label style={fieldLabel}>Espessura (cm)</label>
            <input
              style={inputStyle}
              type="number"
              value={wall.thickness}
              onChange={(e) => onUpdateWall({ thickness: Number(e.target.value) || 1 })}
            />
          </div>
        </>
      )}

      {opening && (
        <>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <label style={fieldLabel}>Tipo</label>
            <select
              style={inputStyle}
              value={opening.kind}
              onChange={(e) => onUpdateOpening({ kind: e.target.value as Opening["kind"] })}
            >
              <option value="door">Porta</option>
              <option value="window">Janela</option>
            </select>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <label style={fieldLabel}>Largura (cm)</label>
            <input
              style={inputStyle}
              type="number"
              value={opening.width}
              onChange={(e) => onUpdateOpening({ width: Number(e.target.value) || 1 })}
            />
          </div>
        </>
      )}

      {device && (
        <>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <label style={fieldLabel}>Nome</label>
            <input
              style={inputStyle}
              value={device.label}
              onChange={(e) => onUpdateDevice({ label: e.target.value })}
            />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <label style={fieldLabel}>Ícone</label>
            <select
              style={inputStyle}
              value={device.icon}
              onChange={(e) => onUpdateDevice({ icon: e.target.value as DeviceIconType })}
            >
              {DEVICE_ICON_OPTIONS.map((opt) => (
                <option key={opt.type} value={opt.type}>
                  {opt.emoji} {opt.label}
                </option>
              ))}
            </select>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 4, flex: 1 }}>
              <label style={fieldLabel}>Largura (cm)</label>
              <input
                style={inputStyle}
                type="number"
                min="10"
                value={device.width ?? 40}
                onChange={(e) => onUpdateDevice({ width: Number(e.target.value) || 10 })}
              />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4, flex: 1 }}>
              <label style={fieldLabel}>Altura (cm)</label>
              <input
                style={inputStyle}
                type="number"
                min="10"
                value={device.height ?? 40}
                onChange={(e) => onUpdateDevice({ height: Number(e.target.value) || 10 })}
              />
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <label style={fieldLabel}>Rotação do ícone</label>
            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
              <button
                type="button"
                onClick={() => onUpdateDevice({ rotation: (device.rotation - 15 + 360) % 360 })}
                style={rotateButtonStyle}
              >
                ↺
              </button>
              <div style={{ flex: 1, textAlign: "center", fontSize: 12 }}>{device.rotation}°</div>
              <button
                type="button"
                onClick={() => onUpdateDevice({ rotation: (device.rotation + 15) % 360 })}
                style={rotateButtonStyle}
              >
                ↻
              </button>
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <label style={fieldLabel}>Dispositivo (opcional)</label>
            <select
              style={inputStyle}
              value={device.cameraKey ?? device.deviceId ?? ""}
              onChange={(e) => {
                // Os três vínculos são mutuamente exclusivos: escolher um
                // precisa limpar os outros, senão o ícone responderia pelo
                // vínculo antigo que ficou para trás.
                const value = e.target.value;
                const isCamera = value.startsWith("ha:") || value.startsWith("tapo:");
                onUpdateDevice({
                  deviceId: isCamera || !value ? undefined : value,
                  cameraKey: isCamera ? value : undefined,
                  entityId: undefined,
                  // As escolhas abaixo são entidades do dispositivo antigo.
                  controlEntityId: undefined,
                  infoEntityIds: undefined,
                });
              }}
            >
              <option value="">Nenhum (só visual)</option>
              {customDevices.length > 0 && (
                <optgroup label="Dispositivos">
                  {customDevices.map((d) => (
                    <option key={d.id} value={d.id}>
                      {customDeviceLabel(d, areaName)}
                    </option>
                  ))}
                </optgroup>
              )}
              {cameras.length > 0 && (
                <optgroup label="Câmeras">
                  {cameras.map((c) => (
                    <option key={c.key} value={c.key}>
                      {c.name}
                    </option>
                  ))}
                </optgroup>
              )}
            </select>
            {device.entityId && !device.deviceId && (
              <div style={{ fontSize: 11, color: TEXT_MUTED_3 }}>
                Este ícone ainda usa o vínculo antigo direto na entidade{" "}
                <strong>{device.entityId}</strong>. Escolha um dispositivo acima para atualizar.
              </div>
            )}
            {customDevices.length === 0 && cameras.length === 0 && (
              <div style={{ fontSize: 11, color: TEXT_MUTED_3 }}>
                Nenhum dispositivo criado ainda — monte um em Configurações → Dispositivos.
              </div>
            )}
          </div>

          {selectedDevice && (
            <>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <label style={fieldLabel}>O que o clique liga/desliga</label>
                <select
                  style={inputStyle}
                  value={device.controlEntityId ?? ""}
                  onChange={(e) =>
                    onUpdateDevice({ controlEntityId: e.target.value || undefined })
                  }
                >
                  <option value="">
                    {selectedDevice.isSwitch ? "Todas juntas (interruptor)" : "Nada"}
                  </option>
                  {controllableEntities.map((entity) => (
                    <option key={entity.entity_id} value={entity.entity_id}>
                      {friendlyName(entity)}
                    </option>
                  ))}
                </select>
                {controllableEntities.length === 0 && (
                  <div style={{ fontSize: 11, color: TEXT_MUTED_3 }}>
                    Este dispositivo não tem nenhuma entidade de ligar/desligar.
                  </div>
                )}
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <label style={fieldLabel}>Mostrar ao passar o mouse</label>
                <div
                  style={{
                    maxHeight: 150,
                    overflowY: "auto",
                    border: `1px solid ${BORDER}`,
                    borderRadius: 6,
                    padding: "6px 8px",
                  }}
                >
                  {deviceEntities.length === 0 ? (
                    <div style={{ fontSize: 11, color: TEXT_MUTED_3 }}>Sem entidades.</div>
                  ) : (
                    deviceEntities.map((entity) => {
                      const checked = (device.infoEntityIds ?? []).includes(entity.entity_id);
                      return (
                        <label
                          key={entity.entity_id}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 6,
                            fontSize: 12,
                            padding: "2px 0",
                            cursor: "pointer",
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={(e) => {
                              const current = device.infoEntityIds ?? [];
                              const next = e.target.checked
                                ? [...current, entity.entity_id]
                                : current.filter((id) => id !== entity.entity_id);
                              onUpdateDevice({ infoEntityIds: next.length > 0 ? next : undefined });
                            }}
                          />
                          <span
                            style={{
                              minWidth: 0,
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {friendlyName(entity)}
                          </span>
                        </label>
                      );
                    })
                  )}
                </div>
              </div>
            </>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <label style={fieldLabel}>Imagem (opcional, substitui o emoji)</label>
            <IconPicker value={device.imageUrl} onSelect={(url) => onUpdateDevice({ imageUrl: url })} />
          </div>
        </>
      )}

      {furniture && (
        <>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <label style={fieldLabel}>Nome</label>
            <input
              style={inputStyle}
              value={furniture.label}
              onChange={(e) => onUpdateFurniture({ label: e.target.value })}
            />
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 4, flex: 1 }}>
              <label style={fieldLabel}>Largura (cm)</label>
              <input
                style={inputStyle}
                type="number"
                min="10"
                value={furniture.width}
                onChange={(e) => onUpdateFurniture({ width: Number(e.target.value) || 10 })}
              />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4, flex: 1 }}>
              <label style={fieldLabel}>Altura (cm)</label>
              <input
                style={inputStyle}
                type="number"
                min="10"
                value={furniture.height}
                onChange={(e) => onUpdateFurniture({ height: Number(e.target.value) || 10 })}
              />
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <label style={fieldLabel}>Rotação</label>
            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
              <button
                type="button"
                onClick={() => onUpdateFurniture({ rotation: (furniture.rotation - 15 + 360) % 360 })}
                style={rotateButtonStyle}
              >
                ↺
              </button>
              <div style={{ flex: 1, textAlign: "center", fontSize: 12 }}>{furniture.rotation}°</div>
              <button
                type="button"
                onClick={() => onUpdateFurniture({ rotation: (furniture.rotation + 15) % 360 })}
                style={rotateButtonStyle}
              >
                ↻
              </button>
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <label style={fieldLabel}>Imagem</label>
            <IconPicker
              value={furniture.imageUrl}
              onSelect={(url) => onUpdateFurniture({ imageUrl: url })}
            />
          </div>
        </>
      )}

      {floor && (
        <>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <label style={fieldLabel}>Nome</label>
            <input
              style={inputStyle}
              value={floor.label}
              onChange={(e) => onUpdateFloor({ label: e.target.value })}
            />
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 4, flex: 1 }}>
              <label style={fieldLabel}>Largura (cm)</label>
              <input
                style={inputStyle}
                type="number"
                min="10"
                value={floor.width}
                onChange={(e) => onUpdateFloor({ width: Number(e.target.value) || 10 })}
              />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4, flex: 1 }}>
              <label style={fieldLabel}>Altura (cm)</label>
              <input
                style={inputStyle}
                type="number"
                min="10"
                value={floor.height}
                onChange={(e) => onUpdateFloor({ height: Number(e.target.value) || 10 })}
              />
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <label style={fieldLabel}>Rotação</label>
            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
              <button
                type="button"
                onClick={() => onUpdateFloor({ rotation: (floor.rotation - 15 + 360) % 360 })}
                style={rotateButtonStyle}
              >
                ↺
              </button>
              <div style={{ flex: 1, textAlign: "center", fontSize: 12 }}>{floor.rotation}°</div>
              <button
                type="button"
                onClick={() => onUpdateFloor({ rotation: (floor.rotation + 15) % 360 })}
                style={rotateButtonStyle}
              >
                ↻
              </button>
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <label style={fieldLabel}>Cor</label>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {FLOOR_PRESETS.map((preset) => (
                <div
                  key={preset.fill}
                  onClick={() => onUpdateFloor({ fill: preset.fill, imageUrl: undefined })}
                  title={preset.label}
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: 6,
                    background: preset.fill,
                    cursor: "pointer",
                    border:
                      floor.fill === preset.fill && !floor.imageUrl
                        ? `2px solid ${ACCENT}`
                        : "1px solid oklch(0.38 0.017 50)",
                  }}
                />
              ))}
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <label style={fieldLabel}>Textura (opcional, substitui a cor)</label>
            <IconPicker value={floor.imageUrl} onSelect={(url) => onUpdateFloor({ imageUrl: url })} />
          </div>
        </>
      )}

      <div
        onClick={onDelete}
        style={{
          marginTop: 4,
          textAlign: "center",
          padding: "8px",
          borderRadius: 8,
          background: "oklch(0.3 0.017 50)",
          color: DANGER,
          cursor: "pointer",
          fontWeight: 600,
        }}
      >
        Excluir
      </div>
    </div>
  );
}

/** Vários dispositivos podem ter o mesmo nome (é comum ter uma "Luz" por
 * cômodo), então a área entra no rótulo para dar para diferenciar. */
function customDeviceLabel(device: CustomDevice, areaName: Map<string, string>): string {
  const area = device.areaId ? areaName.get(device.areaId) : undefined;
  return area ? `${device.name} — ${area}` : device.name;
}
