"use client";

import { ACCENT, BORDER, CHIP_BG, TEXT_DIM, TEXT_MUTED_2 } from "@/lib/theme";
import { COOL_WHITE_KELVIN, WARM_WHITE_KELVIN } from "@/hooks/useLightColorBrightness";
import { PRESET_TOLERANCE_KELVIN } from "@/lib/ha/lightColor";

function WhitePresetButton({
  label,
  kelvin,
  current,
  onClick,
}: {
  label: string;
  kelvin: number;
  current: number;
  onClick: () => void;
}) {
  const active = Math.abs(current - kelvin) <= PRESET_TOLERANCE_KELVIN;
  return (
    <button
      type="button"
      onClick={onClick}
      title={`${kelvin}K`}
      style={{
        padding: "4px 10px",
        fontSize: 12,
        borderRadius: 999,
        border: `1px solid ${active ? ACCENT : BORDER}`,
        background: CHIP_BG,
        color: active ? ACCENT : TEXT_DIM,
        cursor: "pointer",
        whiteSpace: "nowrap",
      }}
    >
      {label}
    </button>
  );
}

export function LightColorBrightnessControls({
  showColor,
  showBrightness,
  showColorTemp = false,
  colorHex,
  brightnessPct,
  kelvin = 0,
  kelvinRange = [2000, 6500],
  onColorChange,
  onBrightnessChange,
  onColorTempChange,
}: {
  showColor: boolean;
  showBrightness: boolean;
  showColorTemp?: boolean;
  colorHex: string;
  brightnessPct: number;
  kelvin?: number;
  kelvinRange?: [number, number];
  onColorChange: (hex: string) => void;
  onBrightnessChange: (pct: number) => void;
  onColorTempChange?: (kelvin: number) => void;
}) {
  if (!showColor && !showBrightness && !showColorTemp) return null;
  const [minK, maxK] = kelvinRange;
  const setTemp = onColorTempChange ?? (() => {});
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {(showColor || showBrightness) && (
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {showColor && (
            <input
              type="color"
              value={colorHex}
              onChange={(e) => onColorChange(e.target.value)}
              aria-label="Cor da luz"
              style={{
                width: 32,
                height: 32,
                padding: 0,
                border: "none",
                borderRadius: 8,
                background: "none",
                cursor: "pointer",
                flexShrink: 0,
              }}
            />
          )}
          {showBrightness && (
            <input
              type="range"
              min={1}
              max={100}
              value={brightnessPct}
              onChange={(e) => onBrightnessChange(Number(e.target.value))}
              aria-label="Brilho"
              style={{ flex: 1, accentColor: ACCENT }}
            />
          )}
        </div>
      )}
      {showColorTemp && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <WhitePresetButton
              label="Branco quente"
              kelvin={Math.max(minK, WARM_WHITE_KELVIN)}
              current={kelvin}
              onClick={() => setTemp(Math.max(minK, WARM_WHITE_KELVIN))}
            />
            <WhitePresetButton
              label="Branco frio"
              kelvin={Math.min(maxK, COOL_WHITE_KELVIN)}
              current={kelvin}
              onClick={() => setTemp(Math.min(maxK, COOL_WHITE_KELVIN))}
            />
            <div style={{ fontSize: 12, color: TEXT_MUTED_2, marginLeft: "auto" }}>{kelvin}K</div>
          </div>
          <input
            type="range"
            min={minK}
            max={maxK}
            step={50}
            value={Math.max(minK, Math.min(maxK, kelvin))}
            onChange={(e) => setTemp(Number(e.target.value))}
            aria-label="Temperatura da luz"
            style={{
              width: "100%",
              accentColor: ACCENT,
              // Gradiente quente→frio para diferenciar do slider de brilho.
              background: "linear-gradient(to right, #ff9329, #ffffff, #cfe0ff)",
              borderRadius: 999,
            }}
          />
        </div>
      )}
    </div>
  );
}
