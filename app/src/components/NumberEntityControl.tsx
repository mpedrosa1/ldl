"use client";

import { useEffect, useRef, useState } from "react";
import type { HassEntity } from "home-assistant-js-websocket";
import { callService } from "@/hooks/useHaEntities";
import { ACCENT, INPUT_BG } from "@/lib/theme";

const boxInputStyle: React.CSSProperties = {
  background: INPUT_BG,
  border: "1px solid oklch(0.38 0.017 50)",
  borderRadius: 6,
  padding: "6px 10px",
  color: "oklch(0.94 0.006 50)",
  fontSize: 13,
  width: 90,
  boxSizing: "border-box",
};

/**
 * HA's `number` domain entities (min/max/step/mode attributes) are meant to
 * be set, not just read — this renders the slider or number box HA itself
 * would show. Slider drags are debounced (same lesson as the light
 * brightness slider: calling the service on every tick stalls the app), the
 * number box only commits on blur/Enter so typing doesn't fire a call per digit.
 */
export function NumberEntityControl({ entity }: { entity: HassEntity }) {
  const min = entity.attributes.min as number | undefined;
  const max = entity.attributes.max as number | undefined;
  const step = (entity.attributes.step as number | undefined) ?? 1;
  const mode = (entity.attributes.mode as string | undefined) ?? "auto";
  const currentValue = Number(entity.state);

  const [draft, setDraft] = useState<string | null>(null);
  const sliderTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (sliderTimer.current) clearTimeout(sliderTimer.current);
    };
  }, []);

  function commit(value: number) {
    callService("number", "set_value", entity.entity_id, { value });
  }

  function handleSliderChange(value: number) {
    setDraft(String(value));
    if (sliderTimer.current) clearTimeout(sliderTimer.current);
    sliderTimer.current = setTimeout(() => {
      commit(value);
      sliderTimer.current = null;
      setTimeout(() => setDraft(null), 1500);
    }, 250);
  }

  function handleBoxCommit(raw: string) {
    const value = Number(raw);
    if (!Number.isNaN(value)) commit(value);
    setDraft(null);
  }

  if (mode === "slider" && min != null && max != null) {
    const displayValue = draft != null ? Number(draft) : currentValue;
    return (
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={displayValue}
        onChange={(e) => handleSliderChange(Number(e.target.value))}
        aria-label="Valor"
        style={{ width: "100%", accentColor: ACCENT }}
      />
    );
  }

  const displayValue = draft ?? String(currentValue);
  return (
    <input
      type="number"
      min={min}
      max={max}
      step={step}
      value={displayValue}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={(e) => handleBoxCommit(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === "Enter") (e.target as HTMLInputElement).blur();
      }}
      aria-label="Valor"
      style={boxInputStyle}
    />
  );
}
