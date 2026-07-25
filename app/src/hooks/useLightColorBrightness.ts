"use client";

import { useEffect, useRef, useState } from "react";
import type { HassEntity } from "home-assistant-js-websocket";
import { callService } from "@/hooks/useHaEntities";

const LIGHT_COLOR_MODES = new Set(["hs", "rgb", "rgbw", "rgbww", "xy"]);

export function rgbToHex([r, g, b]: [number, number, number]): string {
  return (
    "#" +
    [r, g, b]
      .map((c) => Math.max(0, Math.min(255, Math.round(c))).toString(16).padStart(2, "0"))
      .join("")
  );
}

export function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function lightSupportsColor(entity: HassEntity): boolean {
  const modes = (entity.attributes.supported_color_modes as string[] | undefined) ?? [];
  return modes.some((m) => LIGHT_COLOR_MODES.has(m));
}

export function lightSupportsBrightness(entity: HassEntity): boolean {
  const modes = (entity.attributes.supported_color_modes as string[] | undefined) ?? [];
  return modes.length > 0 && !modes.every((m) => m === "onoff");
}

/**
 * Debounced color/brightness control targeting one or more light entities at
 * once (used both for a single light and for an "interruptor" applying the
 * same color to every light it contains). Dragging the slider/color picker
 * fires onChange on every tick — calling the HA service on each tick flooded
 * the connection enough to stall the app, so only the settled value (250ms
 * after the last change) is actually sent.
 */
export function useLightColorBrightness(entityIds: string[], reference: HassEntity | undefined) {
  const colorTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const brightnessTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [draftColorHex, setDraftColorHex] = useState<string | null>(null);
  const [draftBrightness, setDraftBrightness] = useState<number | null>(null);

  useEffect(() => {
    return () => {
      if (colorTimer.current) clearTimeout(colorTimer.current);
      if (brightnessTimer.current) clearTimeout(brightnessTimer.current);
    };
  }, []);

  const rgbColor = reference?.attributes.rgb_color as [number, number, number] | undefined;
  const colorHex = draftColorHex ?? (rgbColor ? rgbToHex(rgbColor) : "#ffffff");
  const brightnessPct =
    draftBrightness ??
    (reference?.attributes.brightness != null
      ? Math.round(((reference.attributes.brightness as number) / 255) * 100)
      : 100);

  function setColor(hex: string) {
    setDraftColorHex(hex);
    if (colorTimer.current) clearTimeout(colorTimer.current);
    colorTimer.current = setTimeout(() => {
      callService("light", "turn_on", entityIds, { rgb_color: hexToRgb(hex) });
      colorTimer.current = null;
      setTimeout(() => setDraftColorHex(null), 1500);
    }, 250);
  }

  function setBrightness(pct: number) {
    setDraftBrightness(pct);
    if (brightnessTimer.current) clearTimeout(brightnessTimer.current);
    brightnessTimer.current = setTimeout(() => {
      callService("light", "turn_on", entityIds, { brightness_pct: pct });
      brightnessTimer.current = null;
      setTimeout(() => setDraftBrightness(null), 1500);
    }, 250);
  }

  return { colorHex, brightnessPct, setColor, setBrightness };
}
