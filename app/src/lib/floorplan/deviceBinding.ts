import type { HassEntity } from "home-assistant-js-websocket";
import type { CustomDevice } from "@/hooks/useCustomDevices";
import type { CameraOption } from "@/lib/cameras/list";
import { augmentDevice, friendlyName } from "@/lib/ha/devices";
import type { PlacedDevice } from "./types";

/**
 * Resolve o que um ícone da planta baixa representa: um dispositivo criado em
 * Configurações → Dispositivos, ou uma câmera da página Câmeras. Plantas
 * antigas podem ainda apontar direto para uma entidade do HA, e essas
 * continuam funcionando.
 *
 * Estado e acionamento seguem exatamente as regras do card em Cômodos, para o
 * mesmo dispositivo não se comportar de um jeito no card e de outro na planta.
 */

export interface DeviceBinding {
  /** Entidades que o ícone controla. Vazio = ícone só decorativo. */
  entityIds: string[];
  name?: string;
  /** Ligado quando qualquer membro está ligado — igual ao card. */
  isOn: boolean;
  allUnavailable: boolean;
  /** Clique abre a câmera em vez de acionar algo. */
  cameraKey?: string;
  /** Vale a pena clicar (aciona algo ou abre uma câmera). */
  interactive: boolean;
}

export function resolveBinding(
  placed: PlacedDevice,
  customDevices: CustomDevice[],
  entities: HassEntity[],
  cameras: CameraOption[] = [],
): DeviceBinding {
  // Câmera tem precedência: é um vínculo próprio e não aciona nada.
  if (placed.cameraKey) {
    const camera = cameras.find((c) => c.key === placed.cameraKey);
    return {
      entityIds: [],
      name: camera?.name,
      isOn: false,
      allUnavailable: false,
      cameraKey: placed.cameraKey,
      // Continua clicável mesmo se a câmera sumiu da lista: a página de
      // Câmeras é o lugar certo para o usuário descobrir o que aconteceu.
      interactive: true,
    };
  }

  const custom = placed.deviceId
    ? customDevices.find((d) => d.id === placed.deviceId)
    : undefined;

  const entityIds = custom
    ? custom.entityIds
    : placed.entityId
      ? [placed.entityId]
      : [];

  const members = entityIds
    .map((id) => entities.find((e) => e.entity_id === id))
    .filter((e): e is HassEntity => e != null);

  const augmented = members.map(augmentDevice).filter((d) => d != null);

  return {
    entityIds,
    // Sem dispositivo composto (vínculo antigo), o nome da própria entidade
    // ainda serve de rótulo — senão o ícone ficaria sem tooltip nenhum.
    name: custom?.name ?? (members.length === 1 ? friendlyName(members[0]) : undefined),
    isOn: augmented.some((d) => d.isOn),
    allUnavailable: members.length > 0 && members.every((e) => e.state === "unavailable"),
    interactive: entityIds.length > 0,
  };
}
