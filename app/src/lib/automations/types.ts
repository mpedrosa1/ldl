/**
 * Modelo das automações do LDL. Deliberadamente independente do Home
 * Assistant: quem avalia gatilhos e condições e executa os blocos é o nosso
 * servidor — o HA entra só como a camada que efetivamente liga/desliga os
 * dispositivos.
 *
 * A estrutura é uma árvore de blocos aninhados (como no Scratch): cada bloco
 * de controle carrega listas de blocos filhos, e o editor renderiza essa
 * árvore direto, sem etapa de compilação.
 */

export type ComparisonOperator = "==" | "!=" | "<" | "<=" | ">" | ">=";

/** O que faz a automação começar a rodar. */
export type Trigger =
  /** Uma entidade do HA mudou de estado. `from`/`to` vazios = qualquer mudança. */
  | { kind: "state"; entityId: string; from?: string; to?: string }
  /** Todo dia num horário fixo, "HH:MM". */
  | { kind: "time"; at: string }
  /** De X em X minutos, a partir de quando o servidor sobe. */
  | { kind: "interval"; everyMinutes: number }
  /** Só roda quando o usuário aperta "Executar agora". */
  | { kind: "manual" };

/** Valores que um bloco pode ler para comparar ou usar numa conta. */
export type Value =
  | { kind: "literal"; value: string | number | boolean }
  /** Estado atual de uma entidade (ex: "on", "23.5"). */
  | { kind: "entityState"; entityId: string }
  /** Um atributo da entidade (ex: brilho, temperatura atual). */
  | { kind: "entityAttribute"; entityId: string; attribute: string }
  | { kind: "variable"; name: string }
  /** Conta entre dois valores — o que permite contadores e acumuladores. */
  | { kind: "math"; op: "+" | "-" | "*" | "/"; left: Value; right: Value };

export type Condition =
  | { kind: "compare"; left: Value; op: ComparisonOperator; right: Value }
  /** Hora do dia dentro de uma faixa; suporta faixas que cruzam a meia-noite. */
  | { kind: "timeRange"; from: string; to: string }
  | { kind: "and"; items: Condition[] }
  | { kind: "or"; items: Condition[] }
  | { kind: "not"; item: Condition };

export type Block =
  | { id: string; kind: "if"; condition: Condition; then: Block[]; otherwise: Block[] }
  | { id: string; kind: "repeat"; times: Value; body: Block[] }
  | { id: string; kind: "while"; condition: Condition; body: Block[] }
  | { id: string; kind: "wait"; seconds: Value }
  /** Liga/desliga qualquer entidade que aceite (luz, tomada, interruptor...). */
  | { id: string; kind: "turn"; entityIds: string[]; on: boolean }
  /**
   * `mode` decide o que vai para o HA: "color" manda `rgb_color`, "temp" manda
   * `color_temp_kelvin` (os brancos quente/frio). Ausente = "color", para os
   * blocos criados antes de existir o modo branco continuarem iguais.
   */
  | {
      id: string;
      kind: "light";
      entityIds: string[];
      mode?: "color" | "temp";
      color?: string;
      kelvin?: Value;
      brightnessPct?: Value;
    }
  | { id: string; kind: "setNumber"; entityId: string; value: Value }
  /** Modo privacidade das câmeras Tapo — não passa pelo HA. */
  | { id: string; kind: "cameraPrivacy"; cameraId: string; enabled: boolean }
  | { id: string; kind: "setVariable"; name: string; value: Value }
  | { id: string; kind: "log"; message: string }
  /** Interrompe a execução da automação inteira. */
  | { id: string; kind: "stop" };

export type BlockKind = Block["kind"];

export interface Automation {
  id: string;
  name: string;
  enabled: boolean;
  trigger: Trigger;
  blocks: Block[];
}

export interface AutomationRunEntry {
  automationId: string;
  automationName: string;
  startedAt: string;
  finishedAt: string;
  ok: boolean;
  /** Linhas do bloco "anotar", mais erros e avisos de limite. */
  messages: string[];
}

/** Limites de segurança: uma automação mal montada não pode travar o servidor. */
export const MAX_LOOP_ITERATIONS = 1000;
export const MAX_RUN_DURATION_MS = 5 * 60 * 1000;
export const MAX_RUN_LOG_ENTRIES = 50;
