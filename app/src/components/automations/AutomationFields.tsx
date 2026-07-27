"use client";

import { useMemo } from "react";
import type { HassEntity } from "home-assistant-js-websocket";
import { friendlyName } from "@/lib/ha/devices";
import { LITERAL } from "@/lib/automations/blockMeta";
import type { Condition, ComparisonOperator, Value } from "@/lib/automations/types";
import { BORDER_STRONG, INPUT_BG, TEXT, TEXT_MUTED_3 } from "@/lib/theme";

/** Campos que aparecem "dentro" dos blocos. São propositalmente pequenos e
 * embutidos na frase do bloco, para a automação continuar sendo lida como
 * texto e não como formulário. */

const fieldStyle: React.CSSProperties = {
  background: INPUT_BG,
  border: `1px solid ${BORDER_STRONG}`,
  borderRadius: 6,
  padding: "3px 6px",
  color: TEXT,
  fontSize: 12,
  maxWidth: 220,
};

export function Select({
  value,
  onChange,
  options,
  width,
}: {
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  width?: number;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      style={{ ...fieldStyle, width, cursor: "pointer" }}
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}

export function Input({
  value,
  onChange,
  type = "text",
  width = 90,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  type?: string;
  width?: number;
  placeholder?: string;
}) {
  return (
    <input
      type={type}
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      style={{ ...fieldStyle, width, boxSizing: "border-box" }}
    />
  );
}

export function Word({ children }: { children: React.ReactNode }) {
  return <span style={{ fontSize: 12, fontWeight: 700, opacity: 0.85 }}>{children}</span>;
}

function entityOptions(entities: HassEntity[]) {
  return [
    { value: "", label: "escolher…" },
    ...entities
      .map((entity) => ({ value: entity.entity_id, label: friendlyName(entity) }))
      .sort((a, b) => a.label.localeCompare(b.label, "pt-BR")),
  ];
}

export function EntitySelect({
  value,
  onChange,
  entities,
  domains,
}: {
  value: string;
  onChange: (value: string) => void;
  entities: HassEntity[];
  /** Restringe a lista (ex: só `light` no bloco de cor). */
  domains?: string[];
}) {
  const options = useMemo(() => {
    const filtered = domains
      ? entities.filter((entity) => domains.includes(entity.entity_id.split(".")[0]))
      : entities;
    return entityOptions(filtered);
  }, [entities, domains]);

  return <Select value={value} onChange={onChange} options={options} width={200} />;
}

/** Seleção de várias entidades — um bloco "ligar" costuma acionar mais de uma. */
export function EntityMultiSelect({
  values,
  onChange,
  entities,
  domains,
}: {
  values: string[];
  onChange: (values: string[]) => void;
  entities: HassEntity[];
  domains?: string[];
}) {
  const byId = useMemo(() => new Map(entities.map((e) => [e.entity_id, e])), [entities]);

  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
      {values.map((entityId) => {
        const entity = byId.get(entityId);
        return (
          <span
            key={entityId}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 5,
              background: INPUT_BG,
              border: `1px solid ${BORDER_STRONG}`,
              borderRadius: 999,
              padding: "2px 4px 2px 9px",
              fontSize: 12,
            }}
          >
            {entity ? friendlyName(entity) : entityId}
            <span
              onClick={() => onChange(values.filter((id) => id !== entityId))}
              style={{ cursor: "pointer", padding: "0 4px", opacity: 0.7 }}
            >
              ×
            </span>
          </span>
        );
      })}
      <EntitySelect
        value=""
        onChange={(entityId) => {
          if (entityId && !values.includes(entityId)) onChange([...values, entityId]);
        }}
        entities={entities}
        domains={domains}
      />
    </span>
  );
}

const VALUE_KIND_OPTIONS = [
  { value: "literal", label: "valor fixo" },
  { value: "entityState", label: "estado de" },
  { value: "entityAttribute", label: "atributo de" },
  { value: "variable", label: "variável" },
  { value: "math", label: "conta" },
];

export function ValueEditor({
  value,
  onChange,
  entities,
  /** Contas encaixadas dentro de contas viram um cipoal ilegível — dois níveis bastam. */
  depth = 0,
}: {
  value: Value;
  onChange: (value: Value) => void;
  entities: HassEntity[];
  depth?: number;
}) {
  const kindOptions = depth >= 1 ? VALUE_KIND_OPTIONS.filter((o) => o.value !== "math") : VALUE_KIND_OPTIONS;

  function changeKind(kind: string) {
    switch (kind) {
      case "literal":
        return onChange(LITERAL(""));
      case "entityState":
        return onChange({ kind: "entityState", entityId: "" });
      case "entityAttribute":
        return onChange({ kind: "entityAttribute", entityId: "", attribute: "" });
      case "variable":
        return onChange({ kind: "variable", name: "" });
      case "math":
        return onChange({ kind: "math", op: "+", left: LITERAL(0), right: LITERAL(1) });
    }
  }

  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 5, flexWrap: "wrap" }}>
      <Select value={value.kind} onChange={changeKind} options={kindOptions} width={110} />

      {value.kind === "literal" && (
        <Input
          value={String(value.value)}
          onChange={(text) => onChange(LITERAL(text))}
          width={100}
          placeholder="ex: on, 22"
        />
      )}

      {value.kind === "entityState" && (
        <EntitySelect
          value={value.entityId}
          onChange={(entityId) => onChange({ ...value, entityId })}
          entities={entities}
        />
      )}

      {value.kind === "entityAttribute" && (
        <>
          <EntitySelect
            value={value.entityId}
            onChange={(entityId) => onChange({ ...value, entityId })}
            entities={entities}
          />
          <Input
            value={value.attribute}
            onChange={(attribute) => onChange({ ...value, attribute })}
            width={110}
            placeholder="ex: brightness"
          />
        </>
      )}

      {value.kind === "variable" && (
        <Input
          value={value.name}
          onChange={(name) => onChange({ ...value, name })}
          width={110}
          placeholder="nome"
        />
      )}

      {value.kind === "math" && (
        <>
          <ValueEditor
            value={value.left}
            onChange={(left) => onChange({ ...value, left })}
            entities={entities}
            depth={depth + 1}
          />
          <Select
            value={value.op}
            onChange={(op) => onChange({ ...value, op: op as "+" | "-" | "*" | "/" })}
            options={[
              { value: "+", label: "+" },
              { value: "-", label: "−" },
              { value: "*", label: "×" },
              { value: "/", label: "÷" },
            ]}
            width={52}
          />
          <ValueEditor
            value={value.right}
            onChange={(right) => onChange({ ...value, right })}
            entities={entities}
            depth={depth + 1}
          />
        </>
      )}
    </span>
  );
}

const OPERATOR_OPTIONS: { value: ComparisonOperator; label: string }[] = [
  { value: "==", label: "é igual a" },
  { value: "!=", label: "é diferente de" },
  { value: "<", label: "é menor que" },
  { value: "<=", label: "é menor ou igual a" },
  { value: ">", label: "é maior que" },
  { value: ">=", label: "é maior ou igual a" },
];

const CONDITION_KIND_OPTIONS = [
  { value: "compare", label: "comparação" },
  { value: "timeRange", label: "faixa de horário" },
  { value: "and", label: "todas verdadeiras (E)" },
  { value: "or", label: "alguma verdadeira (OU)" },
  { value: "not", label: "não" },
];

export function ConditionEditor({
  condition,
  onChange,
  entities,
  depth = 0,
}: {
  condition: Condition;
  onChange: (condition: Condition) => void;
  entities: HassEntity[];
  depth?: number;
}) {
  function changeKind(kind: string) {
    switch (kind) {
      case "compare":
        return onChange({
          kind: "compare",
          left: { kind: "entityState", entityId: "" },
          op: "==",
          right: LITERAL("on"),
        });
      case "timeRange":
        return onChange({ kind: "timeRange", from: "22:00", to: "06:00" });
      case "and":
        return onChange({ kind: "and", items: [] });
      case "or":
        return onChange({ kind: "or", items: [] });
      case "not":
        return onChange({
          kind: "not",
          item: { kind: "compare", left: { kind: "entityState", entityId: "" }, op: "==", right: LITERAL("on") },
        });
    }
  }

  const nested = condition.kind === "and" || condition.kind === "or";

  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 5, flexWrap: "wrap" }}>
      <Select value={condition.kind} onChange={changeKind} options={CONDITION_KIND_OPTIONS} width={150} />

      {condition.kind === "compare" && (
        <>
          <ValueEditor
            value={condition.left}
            onChange={(left) => onChange({ ...condition, left })}
            entities={entities}
          />
          <Select
            value={condition.op}
            onChange={(op) => onChange({ ...condition, op: op as ComparisonOperator })}
            options={OPERATOR_OPTIONS}
            width={140}
          />
          <ValueEditor
            value={condition.right}
            onChange={(right) => onChange({ ...condition, right })}
            entities={entities}
          />
        </>
      )}

      {condition.kind === "timeRange" && (
        <>
          <Word>entre</Word>
          <Input
            type="time"
            value={condition.from}
            onChange={(from) => onChange({ ...condition, from })}
            width={95}
          />
          <Word>e</Word>
          <Input type="time" value={condition.to} onChange={(to) => onChange({ ...condition, to })} width={95} />
        </>
      )}

      {condition.kind === "not" && (
        <ConditionEditor
          condition={condition.item}
          onChange={(item) => onChange({ ...condition, item })}
          entities={entities}
          depth={depth + 1}
        />
      )}

      {nested && (
        <span style={{ display: "flex", flexDirection: "column", gap: 6, width: "100%" }}>
          {condition.items.map((item, index) => (
            <span key={index} style={{ display: "flex", alignItems: "center", gap: 6, paddingLeft: 14 }}>
              <ConditionEditor
                condition={item}
                onChange={(next) =>
                  onChange({
                    ...condition,
                    items: condition.items.map((c, i) => (i === index ? next : c)),
                  })
                }
                entities={entities}
                depth={depth + 1}
              />
              <span
                onClick={() =>
                  onChange({ ...condition, items: condition.items.filter((_, i) => i !== index) })
                }
                style={{ cursor: "pointer", fontSize: 12, color: TEXT_MUTED_3 }}
              >
                remover
              </span>
            </span>
          ))}
          <span
            onClick={() =>
              onChange({
                ...condition,
                items: [
                  ...condition.items,
                  { kind: "compare", left: { kind: "entityState", entityId: "" }, op: "==", right: LITERAL("on") },
                ],
              })
            }
            style={{ cursor: "pointer", fontSize: 12, color: TEXT_MUTED_3, paddingLeft: 14 }}
          >
            + adicionar condição
          </span>
        </span>
      )}
    </span>
  );
}
