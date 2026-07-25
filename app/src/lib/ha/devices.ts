import type { HassEntity } from "home-assistant-js-websocket";
import { ACCENT, ACCENT2, DANGER, MUTED, SUCCESS } from "@/lib/theme";

export type DeviceKind =
  | "toggle"
  | "readonly"
  | "thermostat"
  | "camera"
  | "action"
  | "media"
  | "weather"
  | "light"
  | "number";

export interface DomainConfig {
  filterKey: string;
  filterLabel: string;
  kind: DeviceKind;
  typeLabel: string;
  /** For kind "action": the service call a press/activate button should make. */
  action?: { domain: string; service: string; label: string };
}

const ON_STATES = new Set(["on", "open", "playing", "home", "heat", "cool", "locked"]);

const DEFAULT_DOMAIN_CONFIG: DomainConfig = {
  filterKey: "outros",
  filterLabel: "Outros",
  kind: "readonly",
  typeLabel: "Entidade",
};

/**
 * Um DomainConfig por domínio do HA, usado para agrupar/rotular na página
 * Dispositivos e na seleção de entidades em Configurações. Todo domínio tem
 * uma entrada (ou cai no DEFAULT_DOMAIN_CONFIG) — a curadoria do que aparece
 * é feita pelo próprio usuário em Configurações > Entidades do sistema, não
 * mais escondendo domínios inteiros aqui.
 */
export const DOMAIN_CONFIG: Record<string, DomainConfig> = {
  light: { filterKey: "luzes", filterLabel: "Luzes", kind: "light", typeLabel: "Luz" },
  switch: { filterKey: "tomadas", filterLabel: "Tomadas", kind: "toggle", typeLabel: "Tomada" },
  lock: { filterKey: "fechaduras", filterLabel: "Fechaduras", kind: "toggle", typeLabel: "Fechadura" },
  cover: { filterKey: "cortinas", filterLabel: "Cortinas / Portões", kind: "toggle", typeLabel: "Cortina / Portão" },
  fan: { filterKey: "ventiladores", filterLabel: "Ventiladores", kind: "toggle", typeLabel: "Ventilador" },
  siren: { filterKey: "sirenes", filterLabel: "Sirenes", kind: "toggle", typeLabel: "Sirene" },
  climate: { filterKey: "termostatos", filterLabel: "Termostatos", kind: "thermostat", typeLabel: "Termostato" },
  media_player: { filterKey: "midia", filterLabel: "Mídia", kind: "media", typeLabel: "Mídia" },
  camera: { filterKey: "cameras", filterLabel: "Câmeras", kind: "camera", typeLabel: "Câmera" },
  automation: { filterKey: "automacoes", filterLabel: "Automações", kind: "toggle", typeLabel: "Automação" },
  binary_sensor: { filterKey: "sensores", filterLabel: "Sensores", kind: "readonly", typeLabel: "Sensor" },
  sensor: { filterKey: "sensores", filterLabel: "Sensores", kind: "readonly", typeLabel: "Sensor" },
  update: { filterKey: "atualizacoes", filterLabel: "Atualizações", kind: "readonly", typeLabel: "Atualização" },
  number: { filterKey: "numeros", filterLabel: "Números", kind: "number", typeLabel: "Número" },
  select: { filterKey: "selecoes", filterLabel: "Seleções", kind: "readonly", typeLabel: "Seleção" },
  image: { filterKey: "imagens", filterLabel: "Imagens", kind: "readonly", typeLabel: "Imagem" },
  todo: { filterKey: "tarefas", filterLabel: "Listas de tarefas", kind: "readonly", typeLabel: "Lista" },
  tts: { filterKey: "voz", filterLabel: "Texto em voz", kind: "readonly", typeLabel: "Voz" },
  weather: { filterKey: "clima", filterLabel: "Clima", kind: "weather", typeLabel: "Clima" },
  conversation: { filterKey: "assistente", filterLabel: "Assistente", kind: "readonly", typeLabel: "Assistente" },
  sun: { filterKey: "sol", filterLabel: "Sol", kind: "readonly", typeLabel: "Sol" },
  zone: { filterKey: "zonas", filterLabel: "Zonas", kind: "readonly", typeLabel: "Zona" },
  person: { filterKey: "pessoas", filterLabel: "Pessoas", kind: "readonly", typeLabel: "Pessoa" },
  device_tracker: { filterKey: "rastreadores", filterLabel: "Rastreadores", kind: "readonly", typeLabel: "Rastreador" },
  event: { filterKey: "eventos", filterLabel: "Eventos", kind: "readonly", typeLabel: "Evento" },
  button: {
    filterKey: "botoes",
    filterLabel: "Botões",
    kind: "action",
    typeLabel: "Botão",
    action: { domain: "button", service: "press", label: "Executar" },
  },
  scene: {
    filterKey: "cenas",
    filterLabel: "Cenas",
    kind: "action",
    typeLabel: "Cena",
    action: { domain: "scene", service: "turn_on", label: "Ativar" },
  },
};

export function domainConfigFor(domain: string): DomainConfig {
  return DOMAIN_CONFIG[domain] ?? DEFAULT_DOMAIN_CONFIG;
}

export const DEVICE_DOMAINS = Object.keys(DOMAIN_CONFIG);

export function domainOf(entityId: string): string {
  return entityId.split(".")[0];
}

export function friendlyName(entity: HassEntity): string {
  return (entity.attributes.friendly_name as string | undefined) ?? entity.entity_id;
}

export function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/);
  return parts
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}

export interface AugmentedDevice {
  entity: HassEntity;
  domain: string;
  config: DomainConfig;
  isOn: boolean;
  dotColor: string;
  stateText: string;
}

export function augmentDevice(entity: HassEntity): AugmentedDevice | null {
  const domain = domainOf(entity.entity_id);
  const config = domainConfigFor(domain);

  const isOn = ON_STATES.has(entity.state);
  const unit = entity.attributes.unit_of_measurement as string | undefined;

  let dotColor = MUTED;
  let stateText = entity.state;

  switch (config.kind) {
    case "toggle":
      dotColor = isOn ? ACCENT : MUTED;
      stateText = humanState(domain, entity.state);
      break;
    case "readonly":
      dotColor = isOn ? ACCENT2 : MUTED;
      stateText = unit ? `${entity.state} ${unit}` : humanState(domain, entity.state);
      break;
    case "thermostat":
      dotColor = ACCENT2;
      stateText = entity.attributes.temperature
        ? `${entity.attributes.temperature}°C alvo · ${entity.state}`
        : entity.state;
      break;
    case "camera":
      dotColor = DANGER;
      stateText = entity.state === "recording" ? "Gravando" : "Ao vivo";
      break;
    case "action":
      dotColor = MUTED;
      stateText = entity.state;
      break;
    case "media":
      dotColor = isOn ? ACCENT : MUTED;
      stateText = humanState(domain, entity.state);
      break;
    case "weather":
      dotColor = ACCENT2;
      stateText = weatherConditionLabel(entity.state);
      break;
    case "light":
      dotColor = isOn ? ACCENT : MUTED;
      stateText = humanState(domain, entity.state);
      break;
    case "number":
      dotColor = ACCENT2;
      stateText = unit ? `${entity.state} ${unit}` : entity.state;
      break;
  }

  if (domain === "lock") {
    dotColor = entity.state === "locked" ? SUCCESS : DANGER;
  }

  return { entity, domain, config, isOn, dotColor, stateText };
}

const WEATHER_CONDITION_LABELS: Record<string, string> = {
  "clear-night": "Céu limpo (noite)",
  cloudy: "Nublado",
  exceptional: "Excepcional",
  fog: "Nevoeiro",
  hail: "Granizo",
  lightning: "Raios",
  "lightning-rainy": "Raios e chuva",
  partlycloudy: "Parcialmente nublado",
  pouring: "Chuva forte",
  rainy: "Chuvoso",
  snowy: "Nevando",
  "snowy-rainy": "Neve e chuva",
  sunny: "Ensolarado",
  windy: "Ventania",
  "windy-variant": "Ventania",
};

export const WEATHER_CONDITION_EMOJI: Record<string, string> = {
  "clear-night": "🌙",
  cloudy: "☁️",
  exceptional: "❗",
  fog: "🌫️",
  hail: "🌨️",
  lightning: "⚡",
  "lightning-rainy": "⛈️",
  partlycloudy: "⛅",
  pouring: "🌧️",
  rainy: "🌦️",
  snowy: "❄️",
  "snowy-rainy": "🌨️",
  sunny: "☀️",
  windy: "💨",
  "windy-variant": "💨",
};

export function weatherConditionLabel(condition: string): string {
  return WEATHER_CONDITION_LABELS[condition] ?? condition;
}

export const HVAC_ACTION_LABELS: Record<string, string> = {
  heating: "Aquecendo",
  cooling: "Resfriando",
  drying: "Secando",
  fan: "Ventilando",
  idle: "Ocioso",
  off: "Desligado",
};

function humanState(domain: string, state: string): string {
  const dictionaries: Record<string, Record<string, string>> = {
    lock: { locked: "Trancada", unlocked: "Destrancada" },
    cover: { open: "Aberta", closed: "Fechada" },
    binary_sensor: { on: "Detectado", off: "Sem detecção" },
    switch: { on: "Ligada", off: "Desligada" },
    light: { on: "Ligada", off: "Desligada" },
    fan: { on: "Ligado", off: "Desligado" },
    siren: { on: "Ligada", off: "Desligada" },
    automation: { on: "Ativada", off: "Desativada" },
    media_player: { playing: "Tocando", paused: "Pausado", idle: "Ocioso", off: "Desligado" },
    update: { on: "Atualização disponível", off: "Atualizado" },
  };
  return dictionaries[domain]?.[state] ?? state;
}

interface Visibility {
  hidden?: boolean;
}

/**
 * Todas as entidades aparecem, exceto as que o próprio usuário já ocultou ou
 * desabilitou no Home Assistant (registry hidden_by/disabled_by) — essa é uma
 * decisão que já foi tomada por ele lá, não nossa. A curadoria do que
 * realmente aparece no dashboard fica por conta do usuário, em
 * Configurações > Entidades do sistema.
 */
export function isVisibleDevice(entity: HassEntity, meta?: Visibility): boolean {
  if (meta?.hidden) return false;
  return true;
}

export const FILTER_OPTIONS = [
  { key: "todos", label: "Todos" },
  ...[...new Map(Object.values(DOMAIN_CONFIG).map((c) => [c.filterKey, c])).values()].map(
    (c) => ({ key: c.filterKey, label: c.filterLabel }),
  ),
];
