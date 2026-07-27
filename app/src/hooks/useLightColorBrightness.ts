"use client";

import { useEffect, useRef, useState } from "react";
import type { HassEntity } from "home-assistant-js-websocket";
import { callService } from "@/hooks/useHaEntities";

import {
  colorServiceData,
  lightKelvinRange,
  rgbToHex,
} from "@/lib/ha/lightColor";

// As regras puras de cor moraram aqui antes de o motor de automações precisar
// delas no servidor; ficam reexportadas para não quebrar quem já importa daqui.
export {
  COOL_WHITE_KELVIN,
  WARM_WHITE_KELVIN,
  hexToKelvin,
  hexToRgb,
  lightKelvinRange,
  lightSupportsBrightness,
  lightSupportsColor,
  lightSupportsColorTemp,
  rgbToHex,
} from "@/lib/ha/lightColor";

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
  const kelvinTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [draftColorHex, setDraftColorHex] = useState<string | null>(null);
  const [draftBrightness, setDraftBrightness] = useState<number | null>(null);
  const [draftKelvin, setDraftKelvin] = useState<number | null>(null);

  useEffect(() => {
    return () => {
      if (colorTimer.current) clearTimeout(colorTimer.current);
      if (brightnessTimer.current) clearTimeout(brightnessTimer.current);
      if (kelvinTimer.current) clearTimeout(kelvinTimer.current);
    };
  }, []);

  const rgbColor = reference?.attributes.rgb_color as [number, number, number] | undefined;
  const colorHex = draftColorHex ?? (rgbColor ? rgbToHex(rgbColor) : "#ffffff");
  const brightnessPct =
    draftBrightness ??
    (reference?.attributes.brightness != null
      ? Math.round(((reference.attributes.brightness as number) / 255) * 100)
      : 100);
  const kelvinRange = lightKelvinRange(reference);
  const kelvin =
    draftKelvin ??
    (reference?.attributes.color_temp_kelvin as number | undefined) ??
    Math.round((kelvinRange[0] + kelvinRange[1]) / 2);

  function setColor(hex: string) {
    setDraftColorHex(hex);
    if (colorTimer.current) clearTimeout(colorTimer.current);
    colorTimer.current = setTimeout(() => {
      callService("light", "turn_on", entityIds, colorServiceData(hex, reference));
      colorTimer.current = null;
      setTimeout(() => setDraftColorHex(null), 1500);
    }, 250);
  }

  function setColorTemp(k: number) {
    const clamped = Math.max(kelvinRange[0], Math.min(kelvinRange[1], Math.round(k)));
    setDraftKelvin(clamped);
    setDraftColorHex(null);
    if (kelvinTimer.current) clearTimeout(kelvinTimer.current);
    kelvinTimer.current = setTimeout(() => {
      callService("light", "turn_on", entityIds, { color_temp_kelvin: clamped });
      kelvinTimer.current = null;
      setTimeout(() => setDraftKelvin(null), 1500);
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

  return { colorHex, brightnessPct, kelvin, kelvinRange, setColor, setBrightness, setColorTemp };
}
