import type { HassEntity } from "home-assistant-js-websocket";
import type { CustomDevice } from "@/hooks/useCustomDevices";
import type { CameraOption } from "@/lib/cameras/list";
import { augmentDevice, domainConfigFor, domainOf, friendlyName } from "@/lib/ha/devices";
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

/** Só estes domínios têm ligar/desligar — o resto é leitura. */
export function isControllable(entityId: string): boolean {
  const kind = domainConfigFor(domainOf(entityId)).kind;
  return kind === "toggle" || kind === "light";
}

export interface InfoValue {
  entityId: string;
  name: string;
  value: string;
}

export interface DeviceBinding {
  /** Entidades que o clique liga/desliga. Vazio = ícone não aciona nada. */
  entityIds: string[];
  name?: string;
  /** Ligado quando qualquer entidade acionável está ligada. */
  isOn: boolean;
  allUnavailable: boolean;
  /** Clique abre a câmera em vez de acionar algo. */
  cameraKey?: string;
  /** Vale a pena clicar (aciona algo ou abre uma câmera). */
  interactive: boolean;
  /** Leituras mostradas ao passar o mouse. */
  info: InfoValue[];
}

function stateText(entity: HassEntity): string {
  const unit = entity.attributes.unit_of_measurement as string | undefined;
  if (entity.state === "unavailable") return "indisponível";
  if (entity.state === "unknown") return "—";
  return unit ? `${entity.state} ${unit}` : entity.state;
}

export function resolveBinding(
  placed: PlacedDevice,
  customDevices: CustomDevice[],
  entities: HassEntity[],
  cameras: CameraOption[] = [],
): DeviceBinding {
  const find = (id: string) => entities.find((e) => e.entity_id === id);

  const info: InfoValue[] = (placed.infoEntityIds ?? [])
    .map((id) => {
      const entity = find(id);
      return entity ? { entityId: id, name: friendlyName(entity), value: stateText(entity) } : null;
    })
    .filter((v): v is InfoValue => v !== null);

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
      info,
    };
  }

  const custom = placed.deviceId
    ? customDevices.find((d) => d.id === placed.deviceId)
    : undefined;

  const memberIds = custom ? custom.entityIds : placed.entityId ? [placed.entityId] : [];

  /**
   * Qual entidade o clique aciona:
   * 1. a escolhida no editor;
   * 2. num dispositivo "interruptor", todas as acionáveis juntas — é a
   *    semântica dele, e é o que o card em Cômodos faz;
   * 3. se só existe uma acionável, ela mesma;
   * 4. senão nada: com várias candidatas, adivinhar seria pior que não agir.
   */
  const controllable = memberIds.filter(isControllable);
  let entityIds: string[] = [];
  if (placed.controlEntityId && memberIds.includes(placed.controlEntityId)) {
    entityIds = [placed.controlEntityId];
  } else if (custom?.isSwitch) {
    entityIds = controllable;
  } else if (controllable.length === 1) {
    entityIds = controllable;
  }

  const members = entityIds.map(find).filter((e): e is HassEntity => e != null);
  const augmented = members.map(augmentDevice).filter((d) => d != null);

  return {
    entityIds,
    // Sem dispositivo composto (vínculo antigo), o nome da própria entidade
    // ainda serve de rótulo — senão o ícone ficaria sem tooltip nenhum.
    name: custom?.name ?? (members.length === 1 ? friendlyName(members[0]) : undefined),
    isOn: augmented.some((d) => d.isOn),
    allUnavailable: members.length > 0 && members.every((e) => e.state === "unavailable"),
    interactive: entityIds.length > 0,
    info,
  };
}
