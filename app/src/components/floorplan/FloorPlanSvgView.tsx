"use client";

import { useMemo, useRef, useState } from "react";
import type { HassEntity } from "home-assistant-js-websocket";
import type { FloorPlanDoc, PlacedDevice, Wall } from "@/lib/floorplan/types";
import { computeDocBounds, pointOnWall, wallAngleDeg, DEFAULT_DEVICE_SIZE } from "@/lib/floorplan/geometry";
import { iconOptionFor } from "@/lib/floorplan/icons";
import { callService } from "@/hooks/useHaEntities";
import { useCustomDevices } from "@/hooks/useCustomDevices";
import { useTapoCameras } from "@/hooks/useTapoCameras";
import { useHaAreas } from "@/hooks/useHaAreas";
import { cameraOptions } from "@/lib/cameras/list";
import { resolveBinding, type DeviceBinding, type InfoValue } from "@/lib/floorplan/deviceBinding";
import { CameraPopover, POPOVER_HEIGHT, POPOVER_WIDTH } from "./CameraPopover";
import { ACCENT, ACCENT2, CARD_BG, DANGER, MUTED } from "@/lib/theme";

const WALL_COLOR = "oklch(0.55 0.01 50)";

interface OpenCamera {
  key: string;
  name: string;
  left: number;
  top: number;
}

interface HoverInfo {
  title: string;
  values: InfoValue[];
  left: number;
  /** Distância da borda a partir da qual o painel cresce. Ancorar pela base
   * quando o ícone está na metade de baixo evita ter que adivinhar a altura
   * do painel para saber se ele caberia. */
  edge: "top" | "bottom";
  offset: number;
  maxHeight: number;
}

const INFO_WIDTH = 220;

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), Math.max(min, max));

/** Teto de altura para uma planta muito estreita e alta não empurrar o resto
 * da página para baixo. Acima da proporção típica de uma planta larga, para
 * não voltar a criar faixas vazias nos lados no caso comum. */
const MAX_HEIGHT_PX = 640;

/** Read-only, static SVG rendering of a floor plan — no dark editor canvas, no grid, sized to fit its content. Ícones vinculados a um dispositivo continuam clicáveis. */
export function FloorPlanSvgView({
  doc,
  entities,
  /** Ocupa toda a caixa do pai em vez de dimensionar pela proporção do desenho
   * — usado na página em tela cheia, onde quem manda no tamanho é a viewport. */
  fillContainer = false,
}: {
  doc: FloorPlanDoc;
  entities: HassEntity[];
  fillContainer?: boolean;
}) {
  const { devices: customDevices } = useCustomDevices();
  const { cameras: tapoCameras } = useTapoCameras();
  const { entityMeta } = useHaAreas();
  const cameras = useMemo(
    () => cameraOptions(customDevices, entities, tapoCameras, entityMeta),
    [customDevices, entities, tapoCameras, entityMeta],
  );
  const bounds = useMemo(() => computeDocBounds(doc), [doc]);

  const wrapperRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [openCamera, setOpenCamera] = useState<OpenCamera | null>(null);
  const [hoverInfo, setHoverInfo] = useState<HoverInfo | null>(null);

  /** Ponto do ícone convertido para pixels dentro do container. */
  function screenPointFor(device: PlacedDevice): { x: number; y: number; box: DOMRect } | null {
    const svg = svgRef.current;
    const wrapper = wrapperRef.current;
    const ctm = svg?.getScreenCTM();
    if (!svg || !wrapper || !ctm) return null;

    const point = svg.createSVGPoint();
    point.x = device.x;
    point.y = device.y;
    const screen = point.matrixTransform(ctm);
    const box = wrapper.getBoundingClientRect();
    return { x: screen.x - box.left, y: screen.y - box.top, box };
  }

  /**
   * Converte a posição do ícone (coordenadas do desenho) para pixels dentro do
   * container. Usa a matriz do próprio SVG em vez de recalcular a escala à mão:
   * assim as bordas do `preserveAspectRatio="meet"` já entram na conta.
   */
  function popoverPositionFor(device: PlacedDevice): { left: number; top: number } | null {
    const anchor = screenPointFor(device);
    if (!anchor) return null;
    const { x, y, box } = anchor;

    const margin = 8;
    // Abre acima do ícone; se não couber, abre abaixo.
    const preferredTop = y - POPOVER_HEIGHT - 14;
    const top = preferredTop < margin ? y + 18 : preferredTop;

    return {
      left: clamp(x - POPOVER_WIDTH / 2, margin, box.width - POPOVER_WIDTH - margin),
      top: clamp(top, margin, Math.max(box.height - POPOVER_HEIGHT - margin, margin)),
    };
  }

  function showInfo(device: PlacedDevice, binding: DeviceBinding) {
    if (binding.info.length === 0) return;
    const anchor = screenPointFor(device);
    if (!anchor) return;
    const { x, y, box } = anchor;
    const growsUp = y > box.height / 2;
    setHoverInfo({
      title: binding.name ?? device.label,
      values: binding.info,
      // Ancorado à direita do ícone, virando para a esquerda quando não cabe.
      left: clamp(x + 16, 8, Math.max(box.width - INFO_WIDTH - 8, 8)),
      edge: growsUp ? "bottom" : "top",
      offset: growsUp ? clamp(box.height - y - 12, 8, box.height - 16) : clamp(y - 12, 8, box.height - 16),
      maxHeight: box.height - 16,
    });
  }

  function handleDeviceClick(device: PlacedDevice) {
    const binding = resolveBinding(device, customDevices, entities, cameras);

    if (binding.cameraKey) {
      // Abre o ao vivo sobre a própria planta: sair para outra página só para
      // dar uma olhada na câmera tira o usuário do contexto.
      // Sem a matriz do SVG não dá para ancorar no ícone, mas engolir o clique
      // seria pior: a janelinha abre no canto e o usuário arrasta se quiser.
      const position = popoverPositionFor(device) ?? { left: 8, top: 8 };
      setOpenCamera({
        key: binding.cameraKey,
        name: binding.name ?? device.label,
        ...position,
      });
      return;
    }

    // Acionar outro dispositivo não fecha a janelinha: ela só sai pelo "×".
    if (binding.entityIds.length === 0) return;
    // turn_on/turn_off em vez de toggle, para todos os membros do dispositivo
    // acabarem no mesmo estado — igual ao card em Cômodos.
    callService("homeassistant", binding.isOn ? "turn_off" : "turn_on", binding.entityIds);
  }

  return (
    <div
      ref={wrapperRef}
      style={
        fillContainer
          ? { position: "relative", width: "100%", height: "100%" }
          : { position: "relative" }
      }
    >
      <svg
      ref={svgRef}
      viewBox={`${bounds.minX} ${bounds.minY} ${bounds.width} ${bounds.height}`}
      style={
        fillContainer
          ? { display: "block", width: "100%", height: "100%" }
          : {
              display: "block",
              width: "100%",
              // A altura acompanha a proporção do desenho em vez de ser fixa:
              // com altura fixa, uma planta larga ficava com faixas vazias dos
              // lados. O teto evita que uma planta muito alta domine a página —
              // aí o `meet` volta a centralizar, sem distorcer.
              aspectRatio: `${bounds.width} / ${bounds.height}`,
              maxHeight: MAX_HEIGHT_PX,
              margin: "0 auto",
            }
      }
      preserveAspectRatio="xMidYMid meet"
    >
      {/* floors — drawn first, behind everything else */}
      {doc.floors.map((item) => (
        <g key={item.id} transform={`rotate(${item.rotation} ${item.x} ${item.y})`}>
          {item.imageUrl ? (
            <image
              href={item.imageUrl}
              x={item.x - item.width / 2}
              y={item.y - item.height / 2}
              width={item.width}
              height={item.height}
              preserveAspectRatio="none"
            />
          ) : (
            <rect
              x={item.x - item.width / 2}
              y={item.y - item.height / 2}
              width={item.width}
              height={item.height}
              fill={item.fill}
            />
          )}
        </g>
      ))}

      {/* walls */}
      {doc.walls.map((wall) => (
        <line
          key={wall.id}
          x1={wall.x1}
          y1={wall.y1}
          x2={wall.x2}
          y2={wall.y2}
          stroke={WALL_COLOR}
          strokeWidth={wall.thickness}
          strokeLinecap="square"
        />
      ))}

      {/* openings (doors/windows) */}
      {doc.openings.map((opening) => {
        const wall = doc.walls.find((w): w is Wall => w.id === opening.wallId);
        if (!wall) return null;
        const center = pointOnWall(wall, opening.t);
        const angle = wallAngleDeg(wall);
        const color = opening.kind === "door" ? "oklch(0.7 0.13 70)" : "oklch(0.72 0.12 195)";
        return (
          <g key={opening.id} transform={`rotate(${angle} ${center.x} ${center.y})`}>
            <rect
              x={center.x - opening.width / 2}
              y={center.y - wall.thickness / 2 - 1}
              width={opening.width}
              height={wall.thickness + 2}
              fill={CARD_BG}
            />
            <line
              x1={center.x - opening.width / 2}
              y1={center.y}
              x2={center.x + opening.width / 2}
              y2={center.y}
              stroke={color}
              strokeWidth={2}
              strokeDasharray={opening.kind === "window" ? "6 4" : undefined}
            />
          </g>
        );
      })}

      {/* furniture */}
      {doc.furniture.map((item) => (
        <g key={item.id} transform={`rotate(${item.rotation} ${item.x} ${item.y})`}>
          {item.imageUrl ? (
            <image
              href={item.imageUrl}
              x={item.x - item.width / 2}
              y={item.y - item.height / 2}
              width={item.width}
              height={item.height}
              preserveAspectRatio="none"
            />
          ) : (
            <rect
              x={item.x - item.width / 2}
              y={item.y - item.height / 2}
              width={item.width}
              height={item.height}
              fill="oklch(0.30 0.015 50)"
              stroke="oklch(0.42 0.02 50)"
              strokeDasharray="6 4"
              rx={4}
            />
          )}
        </g>
      ))}

      {/* devices */}
      {doc.devices.map((device) => {
        const option = iconOptionFor(device.icon);
        const binding = resolveBinding(device, customDevices, entities, cameras);
        const statusColor = binding.cameraKey
          ? ACCENT2
          : binding.entityIds.length === 0
            ? "oklch(0.4 0.015 50)"
            : binding.allUnavailable
              ? DANGER
              : binding.isOn
                ? ACCENT
                : MUTED;
        const w = device.width ?? DEFAULT_DEVICE_SIZE;
        const h = device.height ?? DEFAULT_DEVICE_SIZE;
        const clickable = binding.interactive;

        return (
          <g
            key={device.id}
            transform={`translate(${device.x} ${device.y})`}
            onClick={(e) => {
              // Sem isto o clique subiria até o container, que fecha o popover
              // — e a janelinha nunca chegaria a aparecer.
              e.stopPropagation();
              handleDeviceClick(device);
            }}
            onMouseEnter={() => showInfo(device, binding)}
            onMouseLeave={() => setHoverInfo(null)}
            style={{ cursor: clickable ? "pointer" : "default" }}
          >
            {/* O tooltip nativo só entra quando não há painel próprio, senão
                os dois apareceriam sobrepostos. */}
            {binding.name && binding.info.length === 0 && <title>{binding.name}</title>}
            <g transform={`rotate(${device.rotation})`}>
              {device.imageUrl ? (
                <>
                  <image
                    href={device.imageUrl}
                    x={-w / 2}
                    y={-h / 2}
                    width={w}
                    height={h}
                    preserveAspectRatio="xMidYMid meet"
                  />
                  <circle cx={w / 2 - 3} cy={-h / 2 + 3} r={4} fill={statusColor} />
                </>
              ) : (
                <>
                  <circle r={Math.min(w, h) / 2} fill="oklch(0.28 0.014 50)" stroke={statusColor} strokeWidth={2} />
                  <text
                    fontSize={Math.min(w, h) * 0.5}
                    textAnchor="middle"
                    dominantBaseline="central"
                  >
                    {option.emoji}
                  </text>
                </>
              )}
            </g>
            <text
              y={Math.max(h, 32) / 2 + 14}
              fontSize={10}
              fill="oklch(0.85 0.006 50)"
              textAnchor="middle"
            >
              {device.label}
            </text>
          </g>
        );
      })}
      </svg>

      {hoverInfo && (
        <div
          style={{
            position: "absolute",
            left: hoverInfo.left,
            [hoverInfo.edge]: hoverInfo.offset,
            width: INFO_WIDTH,
            maxHeight: hoverInfo.maxHeight,
            overflowY: "auto",
            boxSizing: "border-box",
            background: CARD_BG,
            border: "1px solid oklch(0.38 0.017 50)",
            borderRadius: 10,
            padding: "10px 12px",
            boxShadow: "0 8px 24px oklch(0 0 0 / 0.4)",
            // Só informa; deixar o painel capturar o mouse faria ele piscar ao
            // encostar na borda do ícone.
            pointerEvents: "none",
            zIndex: 4,
          }}
        >
          <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 6 }}>{hoverInfo.title}</div>
          {hoverInfo.values.map((value) => (
            <div
              key={value.entityId}
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: 10,
                fontSize: 11,
                padding: "2px 0",
              }}
            >
              <span
                style={{
                  color: "oklch(0.65 0.01 50)",
                  minWidth: 0,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {value.name}
              </span>
              <span style={{ fontWeight: 600, whiteSpace: "nowrap" }}>{value.value}</span>
            </div>
          ))}
        </div>
      )}

      {openCamera && (
        <CameraPopover
          // Trocar de câmera remonta a janelinha, o que reposiciona ela no
          // ícone novo em vez de manter onde o usuário tinha arrastado a anterior.
          key={openCamera.key}
          cameraKey={openCamera.key}
          name={openCamera.name}
          left={openCamera.left}
          top={openCamera.top}
          onClose={() => setOpenCamera(null)}
        />
      )}
    </div>
  );
}
