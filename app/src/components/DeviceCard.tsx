"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { AugmentedDevice } from "@/lib/ha/devices";
import { friendlyName, weatherConditionLabel, WEATHER_CONDITION_EMOJI, HVAC_ACTION_LABELS } from "@/lib/ha/devices";
import { callService } from "@/hooks/useHaEntities";
import {
  useLightColorBrightness,
  lightSupportsColor,
  lightSupportsBrightness,
  lightSupportsColorTemp,
} from "@/hooks/useLightColorBrightness";
import { WeatherForecastModal } from "@/components/WeatherForecastModal";
import { LightColorBrightnessControls } from "@/components/LightColorBrightnessControls";
import { NumberEntityControl } from "@/components/NumberEntityControl";
import { ACCENT, BORDER, CARD_BG, CHIP_BG, DANGER, TEXT_DIMMER, TEXT_MUTED_4, TEXT_SOFT } from "@/lib/theme";

function clampTemp(t: number): number {
  return Math.max(16, Math.min(30, t));
}

const iconButtonStyle: React.CSSProperties = {
  width: 32,
  height: 32,
  borderRadius: 8,
  background: CHIP_BG,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  cursor: "pointer",
  border: "none",
  color: "inherit",
};

function PowerIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 2v9" strokeLinecap="round" />
      <path d="M6.3 6.3a8 8 0 1 0 11.4 0" strokeLinecap="round" />
    </svg>
  );
}

function PlayIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
      <path d="M6 4l14 8-14 8V4z" />
    </svg>
  );
}

function PauseIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
      <path d="M6 4h4v16H6zM14 4h4v16h-4z" />
    </svg>
  );
}

/** The pill-shaped on/off switch — also reused by CustomDeviceCard for "interruptor" devices, where one switch drives every entity in the card together. */
export function ToggleSwitch({ isOn, onClick }: { isOn: boolean; onClick: () => void }) {
  return (
    <div
      onClick={onClick}
      style={{
        width: 42,
        height: 24,
        borderRadius: 999,
        background: isOn ? ACCENT : "oklch(0.36 0.016 50)",
        position: "relative",
        cursor: "pointer",
        flexShrink: 0,
      }}
    >
      <div
        style={{
          width: 18,
          height: 18,
          borderRadius: "50%",
          background: "oklch(0.97 0 0)",
          position: "absolute",
          top: 3,
          left: isOn ? 21 : 3,
          transition: "left 0.15s ease",
        }}
      />
    </div>
  );
}

/** The kind-specific controls/state for one entity — no outer card, no name header, so it can be reused both as a standalone DeviceCard and as one row inside a composite CustomDeviceCard. */
export function EntityControls({ device }: { device: AugmentedDevice }) {
  const router = useRouter();
  const { entity, config, dotColor, stateText, isOn } = device;
  const unavailable = entity.state === "unavailable";
  const [showForecast, setShowForecast] = useState(false);

  function toggle() {
    callService("homeassistant", "toggle", entity.entity_id);
  }

  function adjustTemp(delta: number) {
    const current = (entity.attributes.temperature as number | undefined) ?? 22;
    callService("climate", "set_temperature", entity.entity_id, {
      temperature: clampTemp(current + delta),
    });
  }

  function runAction() {
    if (!config.action) return;
    callService(config.action.domain, config.action.service, entity.entity_id);
  }

  function toggleMediaPower() {
    callService("media_player", entity.state === "off" ? "turn_on" : "turn_off", entity.entity_id);
  }

  function playPause() {
    callService("media_player", "media_play_pause", entity.entity_id);
  }

  const { colorHex, brightnessPct, kelvin, kelvinRange, setColor, setBrightness, setColorTemp } =
    useLightColorBrightness([entity.entity_id], entity);

  return (
    <>
      {config.kind === "light" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ fontSize: 13, color: unavailable ? DANGER : TEXT_DIMMER }}>
              {unavailable ? "Indisponível" : stateText}
            </div>
            <ToggleSwitch isOn={isOn} onClick={toggle} />
          </div>
          {!unavailable && isOn && (
            <LightColorBrightnessControls
              showColor={lightSupportsColor(entity)}
              showBrightness={lightSupportsBrightness(entity)}
              showColorTemp={lightSupportsColorTemp(entity)}
              colorHex={colorHex}
              brightnessPct={brightnessPct}
              kelvin={kelvin}
              kelvinRange={kelvinRange}
              onColorChange={setColor}
              onBrightnessChange={setBrightness}
              onColorTempChange={setColorTemp}
            />
          )}
        </div>
      )}

      {config.kind === "toggle" && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ fontSize: 13, color: unavailable ? DANGER : TEXT_DIMMER }}>
            {unavailable ? "Indisponível" : stateText}
          </div>
          <ToggleSwitch isOn={isOn} onClick={toggle} />
        </div>
      )}

      {config.kind === "readonly" && (
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: unavailable ? DANGER : dotColor }} />
          <div style={{ fontSize: 14, fontWeight: 600, color: unavailable ? DANGER : TEXT_SOFT }}>
            {unavailable ? "Indisponível" : stateText}
          </div>
        </div>
      )}

      {config.kind === "thermostat" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            {unavailable ? (
              <div style={{ fontSize: 14, fontWeight: 600, color: DANGER }}>Indisponível</div>
            ) : (
              <div>
                <div style={{ fontSize: 20, fontWeight: 700 }}>
                  {(entity.attributes.temperature as number | undefined) ?? "--"}°C
                </div>
                {entity.attributes.current_temperature != null && (
                  <div style={{ fontSize: 11, color: TEXT_MUTED_4 }}>
                    Ambiente {entity.attributes.current_temperature as number}°C
                  </div>
                )}
              </div>
            )}
            <div style={{ display: "flex", gap: 6 }}>
              <button
                onClick={() => adjustTemp(-1)}
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 8,
                  background: CHIP_BG,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  fontSize: 16,
                  border: "none",
                  color: "inherit",
                }}
              >
                –
              </button>
              <button
                onClick={() => adjustTemp(1)}
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 8,
                  background: CHIP_BG,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  fontSize: 16,
                  border: "none",
                  color: "inherit",
                }}
              >
                +
              </button>
            </div>
          </div>
          {!unavailable && entity.attributes.hvac_action && (
            <div style={{ fontSize: 11, color: TEXT_MUTED_4 }}>
              {HVAC_ACTION_LABELS[entity.attributes.hvac_action as string] ?? (entity.attributes.hvac_action as string)}
            </div>
          )}
        </div>
      )}

      {config.kind === "action" && config.action && (
        <div
          onClick={runAction}
          style={{
            textAlign: "center",
            padding: 8,
            borderRadius: 8,
            background: CHIP_BG,
            cursor: "pointer",
            fontSize: 13,
            color: TEXT_SOFT,
          }}
        >
          {config.action.label}
        </div>
      )}

      {config.kind === "media" && (
        <div
          style={{
            position: "relative",
            display: "flex",
            flexDirection: "column",
            gap: 10,
            borderRadius: 10,
            overflow: "hidden",
            padding: entity.attributes.entity_picture ? 12 : 0,
            margin: entity.attributes.entity_picture ? -4 : 0,
          }}
        >
          {entity.attributes.entity_picture && (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element -- proxied HA media art, not an optimizable static asset */}
              <img
                src={`/api/ha/media-picture/${entity.entity_id}?t=${entity.last_updated}`}
                alt=""
                style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
              />
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  background:
                    "linear-gradient(180deg, oklch(0.1 0.01 50 / 0.25), oklch(0.1 0.01 50 / 0.85))",
                }}
              />
            </>
          )}

          <div style={{ position: "relative", display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
              <div style={{ fontSize: 13, color: unavailable ? DANGER : TEXT_DIMMER }}>
                {unavailable ? "Indisponível" : stateText}
              </div>
              {entity.attributes.app_name && (
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: TEXT_SOFT,
                    background: CHIP_BG,
                    padding: "3px 10px",
                    borderRadius: 999,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {entity.attributes.app_name as string}
                </div>
              )}
            </div>

            {(entity.attributes.media_title || entity.attributes.media_artist) && (
              <div
                style={{
                  fontSize: 12,
                  color: TEXT_MUTED_4,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {[entity.attributes.media_title, entity.attributes.media_artist]
                  .filter(Boolean)
                  .join(" · ")}
              </div>
            )}

            <div style={{ display: "flex", gap: 8 }}>
              <button
                onClick={toggleMediaPower}
                style={iconButtonStyle}
                aria-label={isOn ? "Desligar" : "Ligar"}
              >
                <PowerIcon />
              </button>
              {["playing", "paused", "buffering"].includes(entity.state) && (
                <button
                  onClick={playPause}
                  style={iconButtonStyle}
                  aria-label={entity.state === "playing" ? "Pausar" : "Tocar"}
                >
                  {entity.state === "playing" ? <PauseIcon /> : <PlayIcon />}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {config.kind === "weather" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {unavailable ? (
            <div style={{ fontSize: 14, fontWeight: 600, color: DANGER }}>Indisponível</div>
          ) : (
            <>
              <div>
                <div style={{ fontSize: 26, fontWeight: 700 }}>
                  {entity.attributes.temperature != null
                    ? `${Math.round(entity.attributes.temperature as number)}°${
                        (entity.attributes.temperature_unit as string | undefined)?.replace("°", "") ?? "C"
                      }`
                    : "--"}
                </div>
                <div style={{ fontSize: 12, color: TEXT_DIMMER }}>
                  {WEATHER_CONDITION_EMOJI[entity.state] ?? ""} {weatherConditionLabel(entity.state)}
                </div>
              </div>

              <div style={{ display: "flex", gap: 14, flexWrap: "wrap", fontSize: 11, color: TEXT_MUTED_4 }}>
                {entity.attributes.humidity != null && <div>Umidade {entity.attributes.humidity as number}%</div>}
                {entity.attributes.pressure != null && (
                  <div>
                    Pressão {entity.attributes.pressure as number} {(entity.attributes.pressure_unit as string) ?? "hPa"}
                  </div>
                )}
                {entity.attributes.wind_speed != null && (
                  <div>
                    Vento {entity.attributes.wind_speed as number} {(entity.attributes.wind_speed_unit as string) ?? "km/h"}
                  </div>
                )}
              </div>

              <div
                onClick={() => setShowForecast(true)}
                style={{
                  textAlign: "center",
                  padding: 8,
                  borderRadius: 8,
                  background: CHIP_BG,
                  cursor: "pointer",
                  fontSize: 13,
                  color: TEXT_SOFT,
                }}
              >
                Ver previsão
              </div>
            </>
          )}

          {showForecast && (
            <WeatherForecastModal entityId={entity.entity_id} onClose={() => setShowForecast(false)} />
          )}
        </div>
      )}

      {config.kind === "number" && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
          {unavailable ? (
            <div style={{ fontSize: 13, color: DANGER }}>Indisponível</div>
          ) : (
            <>
              <NumberEntityControl entity={entity} />
              {entity.attributes.unit_of_measurement && (
                <span style={{ fontSize: 12, color: TEXT_MUTED_4 }}>
                  {entity.attributes.unit_of_measurement as string}
                </span>
              )}
            </>
          )}
        </div>
      )}

      {config.kind === "camera" && (
        <div
          onClick={() => router.push("/cameras")}
          style={{
            textAlign: "center",
            padding: 8,
            borderRadius: 8,
            background: CHIP_BG,
            cursor: "pointer",
            fontSize: 13,
            color: TEXT_SOFT,
          }}
        >
          Ver câmera ao vivo
        </div>
      )}
    </>
  );
}

export function DeviceCard({ device }: { device: AugmentedDevice }) {
  return (
    <div
      style={{
        background: CARD_BG,
        border: `1px solid ${BORDER}`,
        borderRadius: 14,
        padding: 16,
        display: "flex",
        flexDirection: "column",
        gap: 12,
      }}
    >
      <div>
        <div style={{ fontSize: 14, fontWeight: 600 }}>{friendlyName(device.entity)}</div>
        <div style={{ fontSize: 11, color: TEXT_MUTED_4, marginTop: 2 }}>
          {device.config.typeLabel}
        </div>
      </div>

      <EntityControls device={device} />
    </div>
  );
}
