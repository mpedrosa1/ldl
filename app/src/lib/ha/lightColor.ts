import type { HassEntity } from "home-assistant-js-websocket";

/**
 * Regras de cor de lâmpada compartilhadas entre o controle interativo (cards
 * de Cômodos) e o motor de automações. Ficam aqui, fora do hook, porque o
 * motor roda no servidor e não pode importar um módulo "use client".
 */

const LIGHT_COLOR_MODES = new Set(["hs", "rgb", "rgbw", "rgbww", "xy"]);

/** Faixa usada quando a lâmpada não informa a dela nos atributos. */
export const FALLBACK_KELVIN: [number, number] = [2000, 6500];

/** Presets de branco, em kelvin — clampados na faixa real de cada lâmpada. */
export const WARM_WHITE_KELVIN = 2700;
export const COOL_WHITE_KELVIN = 6500;

/** Tolerância para considerar um preset de branco como "o selecionado". */
export const PRESET_TOLERANCE_KELVIN = 150;

/**
 * Acima disto a cor escolhida é considerada cromática e vai como `rgb_color`;
 * abaixo, é um branco e precisa ir como `color_temp_kelvin`.
 */
export const CHROMATIC_SATURATION = 0.15;

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

/** Saturação HSV (0–1) de um hex — 0 é um cinza/branco puro. */
export function saturationOf(hex: string): number {
  const [r, g, b] = hexToRgb(hex);
  const max = Math.max(r, g, b);
  if (max === 0) return 0;
  return (max - Math.min(r, g, b)) / max;
}

/**
 * Aproxima um branco escolhido no seletor RGB para uma temperatura de cor.
 * Não é conversão colorimétrica: usa só o desvio azul-vermelho para posicionar
 * a cor na faixa da lâmpada — branco puro cai no meio, puxado para vermelho vira
 * quente, para azul vira frio. Suficiente porque o controle fino é o slider de
 * kelvin; isto só evita que um branco escolhido no quadrado de cor não funcione.
 */
export function hexToKelvin(hex: string, [minK, maxK]: [number, number]): number {
  const [r, , b] = hexToRgb(hex);
  const t = Math.max(0, Math.min(1, 0.5 + (b - r) / 255));
  return Math.round(minK + (maxK - minK) * t);
}

export function lightSupportsColor(entity: HassEntity): boolean {
  const modes = (entity.attributes.supported_color_modes as string[] | undefined) ?? [];
  return modes.some((m) => LIGHT_COLOR_MODES.has(m));
}

export function lightSupportsColorTemp(entity: HassEntity): boolean {
  const modes = (entity.attributes.supported_color_modes as string[] | undefined) ?? [];
  return modes.includes("color_temp");
}

export function lightKelvinRange(entity: HassEntity | undefined): [number, number] {
  const min = entity?.attributes.min_color_temp_kelvin as number | undefined;
  const max = entity?.attributes.max_color_temp_kelvin as number | undefined;
  return min != null && max != null ? [min, max] : FALLBACK_KELVIN;
}

export function lightSupportsBrightness(entity: HassEntity): boolean {
  const modes = (entity.attributes.supported_color_modes as string[] | undefined) ?? [];
  return modes.length > 0 && !modes.every((m) => m === "onoff");
}

/**
 * Decide como mandar uma cor para o HA. Um branco precisa ir como
 * `color_temp_kelvin`: nestas lâmpadas (supported_color_modes
 * `["color_temp","hs"]`) um `rgb_color` acinzentado joga a lâmpada no modo `hs`
 * com saturação 0, que acende só os LEDs coloridos e deixa os canais de branco
 * apagados — daí a sensação de que "branco não funciona".
 */
export function colorServiceData(
  hex: string,
  reference: HassEntity | undefined,
): Record<string, unknown> {
  const isWhite = saturationOf(hex) < CHROMATIC_SATURATION;
  if (isWhite && reference != null && lightSupportsColorTemp(reference)) {
    return { color_temp_kelvin: hexToKelvin(hex, lightKelvinRange(reference)) };
  }
  return { rgb_color: hexToRgb(hex) };
}
