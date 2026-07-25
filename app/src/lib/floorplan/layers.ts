import type { DeviceIconType } from "./types";
import { categoryFor } from "./icons";

export type LayerId = "piso" | "estrutura" | "moveis" | "eletrodomesticos" | "dispositivos";

export interface LayerInfo {
  id: LayerId;
  label: string;
}

export const LAYERS: LayerInfo[] = [
  { id: "piso", label: "Piso" },
  { id: "estrutura", label: "Estrutura (paredes, portas, janelas)" },
  { id: "moveis", label: "Móveis" },
  { id: "eletrodomesticos", label: "Eletrodomésticos" },
  { id: "dispositivos", label: "Dispositivos" },
];

export interface LayerFlags {
  visible: boolean;
  locked: boolean;
}

export type LayerState = Record<LayerId, LayerFlags>;

export const DEFAULT_LAYER_STATE: LayerState = {
  piso: { visible: true, locked: false },
  estrutura: { visible: true, locked: false },
  moveis: { visible: true, locked: false },
  eletrodomesticos: { visible: true, locked: false },
  dispositivos: { visible: true, locked: false },
};

/** Which layer a device icon belongs to, based on its category (dispositivo/eletrodomestico). */
export function layerForDevice(icon: DeviceIconType): LayerId {
  return categoryFor(icon) === "eletrodomestico" ? "eletrodomesticos" : "dispositivos";
}
