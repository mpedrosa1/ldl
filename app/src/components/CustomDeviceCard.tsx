"use client";

import { useState } from "react";
import type { HassEntity } from "home-assistant-js-websocket";
import type { CustomDevice } from "@/hooks/useCustomDevices";
import { useHaEntities, callService } from "@/hooks/useHaEntities";
import { augmentDevice, friendlyName, domainOf } from "@/lib/ha/devices";
import { useLightColorBrightness, lightSupportsColor, lightSupportsBrightness } from "@/hooks/useLightColorBrightness";
import { EntityControls, ToggleSwitch } from "@/components/DeviceCard";
import { LightColorBrightnessControls } from "@/components/LightColorBrightnessControls";
import { BORDER, BORDER_STRONG, CARD_BG, DANGER, TEXT_DIMMER, TEXT_MUTED_4 } from "@/lib/theme";

function DeviceIcon({ device }: { device: CustomDevice }) {
  return device.icon ? (
    // eslint-disable-next-line @next/next/no-img-element -- small icon from user-managed icon library
    <img src={device.icon} alt="" style={{ width: 28, height: 28, objectFit: "contain", flexShrink: 0 }} />
  ) : (
    <div style={{ width: 28, height: 28, borderRadius: 8, background: "oklch(0.3 0.017 50)", flexShrink: 0 }} />
  );
}

function DeviceHeader({ device }: { device: CustomDevice }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <DeviceIcon device={device} />
      <div style={{ fontSize: 14, fontWeight: 600 }}>{device.name}</div>
    </div>
  );
}

function SharedLightRow({ lights }: { lights: HassEntity[] }) {
  const entityIds = lights.map((l) => l.entity_id);
  const anyColor = lights.some(lightSupportsColor);
  const anyBrightness = lights.some(lightSupportsBrightness);
  const { colorHex, brightnessPct, setColor, setBrightness } = useLightColorBrightness(entityIds, lights[0]);
  return (
    <LightColorBrightnessControls
      showColor={anyColor}
      showBrightness={anyBrightness}
      colorHex={colorHex}
      brightnessPct={brightnessPct}
      onColorChange={setColor}
      onBrightnessChange={setBrightness}
    />
  );
}

function SingleLightRow({ entity }: { entity: HassEntity }) {
  const { colorHex, brightnessPct, setColor, setBrightness } = useLightColorBrightness([entity.entity_id], entity);
  return (
    <LightColorBrightnessControls
      showColor={lightSupportsColor(entity)}
      showBrightness={lightSupportsBrightness(entity)}
      colorHex={colorHex}
      brightnessPct={brightnessPct}
      onColorChange={setColor}
      onBrightnessChange={setBrightness}
    />
  );
}

/** Color/brightness controls for the lights inside an "interruptor" device. With more than one controllable light, a checkbox lets the user apply one shared color to all of them (default) or control each separately. */
function SwitchLightControls({ lights }: { lights: HassEntity[] }) {
  const [sameColor, setSameColor] = useState(true);
  const showCheckbox = lights.length > 1;
  const useShared = lights.length === 1 || sameColor;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {showCheckbox && (
        <label
          style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: TEXT_MUTED_4, cursor: "pointer" }}
        >
          <input type="checkbox" checked={sameColor} onChange={(e) => setSameColor(e.target.checked)} />
          Mesma cor em todas as luzes
        </label>
      )}
      {useShared ? (
        <SharedLightRow lights={lights} />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {lights.map((light) => (
            <div key={light.entity_id} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <div style={{ fontSize: 11, color: TEXT_MUTED_4 }}>{friendlyName(light)}</div>
              <SingleLightRow entity={light} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function CustomDeviceCard({ device }: { device: CustomDevice }) {
  const { entities } = useHaEntities();
  const entityById = new Map(entities.map((e) => [e.entity_id, e]));

  const cardStyle: React.CSSProperties = {
    background: CARD_BG,
    border: `1px solid ${BORDER}`,
    borderRadius: 14,
    padding: 16,
    display: "flex",
    flexDirection: "column",
    gap: 14,
  };

  if (device.isSwitch) {
    const memberEntities = device.entityIds
      .map((id) => entityById.get(id))
      .filter((e): e is NonNullable<typeof e> => Boolean(e));
    const augmentedMembers = memberEntities.map(augmentDevice).filter((d): d is NonNullable<typeof d> => Boolean(d));
    const allUnavailable =
      augmentedMembers.length > 0 && augmentedMembers.every((d) => d.entity.state === "unavailable");
    const isOn = augmentedMembers.some((d) => d.isOn);
    const controllableLights = memberEntities.filter(
      (e) => domainOf(e.entity_id) === "light" && (lightSupportsColor(e) || lightSupportsBrightness(e)),
    );
    const showLightControls = !allUnavailable && isOn && controllableLights.length > 0;

    function toggleAll() {
      // A single turn_on/turn_off (not "toggle") so every member ends up in the
      // SAME state together, instead of each flipping from its own current state.
      callService("homeassistant", isOn ? "turn_off" : "turn_on", device.entityIds);
    }

    return (
      <div
        style={{
          background: CARD_BG,
          border: `1px solid ${BORDER}`,
          borderRadius: 14,
          padding: 16,
          display: "flex",
          flexDirection: "column",
          gap: showLightControls ? 14 : 0,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <DeviceIcon device={device} />
          <div style={{ fontSize: 14, fontWeight: 600, flex: 1, minWidth: 0 }}>{device.name}</div>
          <div style={{ fontSize: 12, color: allUnavailable ? DANGER : TEXT_DIMMER, whiteSpace: "nowrap" }}>
            {allUnavailable ? "Indisponível" : isOn ? "Ligado" : "Desligado"}
          </div>
          <ToggleSwitch isOn={isOn} onClick={toggleAll} />
        </div>

        {showLightControls && <SwitchLightControls lights={controllableLights} />}
      </div>
    );
  }

  return (
    <div style={cardStyle}>
      <DeviceHeader device={device} />

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {device.entityIds.map((entityId, index) => {
          const entity = entityById.get(entityId);
          if (!entity) return null;
          const augmented = augmentDevice(entity);
          if (!augmented) return null;
          return (
            <div
              key={entityId}
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 6,
                paddingTop: index > 0 ? 12 : 0,
                borderTop: index > 0 ? `1px solid ${BORDER_STRONG}` : undefined,
              }}
            >
              <div style={{ fontSize: 11, color: TEXT_MUTED_4 }}>{friendlyName(entity)}</div>
              <EntityControls device={augmented} />
            </div>
          );
        })}
      </div>
    </div>
  );
}
