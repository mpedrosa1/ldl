export interface FloorPreset {
  label: string;
  fill: string;
}

export const FLOOR_PRESETS: FloorPreset[] = [
  { label: "Madeira clara", fill: "oklch(0.62 0.05 70)" },
  { label: "Madeira escura", fill: "oklch(0.42 0.05 55)" },
  { label: "Cerâmica clara", fill: "oklch(0.75 0.01 90)" },
  { label: "Cerâmica escura", fill: "oklch(0.45 0.01 90)" },
  { label: "Concreto", fill: "oklch(0.5 0.006 250)" },
  { label: "Carpete", fill: "oklch(0.48 0.03 40)" },
];

export const DEFAULT_FLOOR_FILL = FLOOR_PRESETS[0].fill;
