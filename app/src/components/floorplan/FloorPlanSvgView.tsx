"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import type { HassEntity } from "home-assistant-js-websocket";
import type { FloorPlanDoc, PlacedDevice, Wall } from "@/lib/floorplan/types";
import { computeDocBounds, pointOnWall, wallAngleDeg, DEFAULT_DEVICE_SIZE } from "@/lib/floorplan/geometry";
import { iconOptionFor } from "@/lib/floorplan/icons";
import { augmentDevice, friendlyName } from "@/lib/ha/devices";
import { callService } from "@/hooks/useHaEntities";
import { ACCENT, CARD_BG, MUTED } from "@/lib/theme";

const WALL_COLOR = "oklch(0.55 0.01 50)";

function entityFor(entities: HassEntity[], entityId?: string): HassEntity | undefined {
  if (!entityId) return undefined;
  return entities.find((e) => e.entity_id === entityId);
}

/** Read-only, static SVG rendering of a floor plan — no dark editor canvas, no grid, sized to fit its content. Devices bound to a real HA entity stay clickable. */
export function FloorPlanSvgView({
  doc,
  entities,
}: {
  doc: FloorPlanDoc;
  entities: HassEntity[];
}) {
  const router = useRouter();
  const bounds = useMemo(() => computeDocBounds(doc), [doc]);

  function handleDeviceClick(device: PlacedDevice) {
    if (!device.entityId) return;
    const domain = device.entityId.split(".")[0];
    if (domain === "camera") {
      router.push("/cameras");
      return;
    }
    callService("homeassistant", "toggle", device.entityId);
  }

  return (
    <svg
      viewBox={`${bounds.minX} ${bounds.minY} ${bounds.width} ${bounds.height}`}
      style={{ width: "100%", height: "100%" }}
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
        const entity = entityFor(entities, device.entityId);
        const augmented = entity ? augmentDevice(entity) : null;
        const statusColor = device.entityId ? ((augmented?.isOn ?? false) ? ACCENT : MUTED) : "oklch(0.4 0.015 50)";
        const w = device.width ?? DEFAULT_DEVICE_SIZE;
        const h = device.height ?? DEFAULT_DEVICE_SIZE;
        const clickable = Boolean(device.entityId);

        return (
          <g
            key={device.id}
            transform={`translate(${device.x} ${device.y})`}
            onClick={() => handleDeviceClick(device)}
            style={{ cursor: clickable ? "pointer" : "default" }}
          >
            {entity && <title>{friendlyName(entity)}</title>}
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
  );
}
