"use client";

import { ACCENT } from "@/lib/theme";

export function LightColorBrightnessControls({
  showColor,
  showBrightness,
  colorHex,
  brightnessPct,
  onColorChange,
  onBrightnessChange,
}: {
  showColor: boolean;
  showBrightness: boolean;
  colorHex: string;
  brightnessPct: number;
  onColorChange: (hex: string) => void;
  onBrightnessChange: (pct: number) => void;
}) {
  if (!showColor && !showBrightness) return null;
  return (
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
  );
}
