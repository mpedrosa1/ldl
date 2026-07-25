import type { DeviceIconType } from "./types";

export type DeviceCategory = "dispositivo" | "eletrodomestico";

export interface DeviceIconOption {
  type: DeviceIconType;
  label: string;
  emoji: string;
  category: DeviceCategory;
  /** Domains suggested when linking this icon to a real HA entity. */
  suggestedDomains?: string[];
}

export const DEVICE_ICON_OPTIONS: DeviceIconOption[] = [
  { type: "light", label: "Lâmpada", emoji: "💡", category: "dispositivo", suggestedDomains: ["light"] },
  { type: "switch", label: "Tomada", emoji: "🔌", category: "dispositivo", suggestedDomains: ["switch"] },
  { type: "lock", label: "Fechadura", emoji: "🔒", category: "dispositivo", suggestedDomains: ["lock"] },
  { type: "camera", label: "Câmera", emoji: "📷", category: "dispositivo", suggestedDomains: ["camera"] },
  {
    type: "sensor",
    label: "Sensor",
    emoji: "📟",
    category: "dispositivo",
    suggestedDomains: ["binary_sensor", "sensor"],
  },
  { type: "generic", label: "Outro", emoji: "⬛", category: "dispositivo" },

  { type: "tv", label: "TV", emoji: "📺", category: "eletrodomestico", suggestedDomains: ["media_player"] },
  {
    type: "projector",
    label: "Projetor",
    emoji: "📽️",
    category: "eletrodomestico",
    suggestedDomains: ["media_player"],
  },
  {
    type: "streaming",
    label: "Fire Stick / Chromecast",
    emoji: "📡",
    category: "eletrodomestico",
    suggestedDomains: ["media_player"],
  },
  {
    type: "speaker",
    label: "Caixa de som",
    emoji: "🔊",
    category: "eletrodomestico",
    suggestedDomains: ["media_player"],
  },
  { type: "ac", label: "Ar-condicionado", emoji: "❄️", category: "eletrodomestico", suggestedDomains: ["climate"] },
  { type: "fan", label: "Ventilador", emoji: "🌀", category: "eletrodomestico", suggestedDomains: ["fan"] },
];

export const ICON_BY_TYPE = new Map(DEVICE_ICON_OPTIONS.map((o) => [o.type, o]));

export function iconOptionFor(type: DeviceIconType): DeviceIconOption {
  return ICON_BY_TYPE.get(type) ?? DEVICE_ICON_OPTIONS[DEVICE_ICON_OPTIONS.length - 1];
}

export function categoryFor(type: DeviceIconType): DeviceCategory {
  return iconOptionFor(type).category;
}
