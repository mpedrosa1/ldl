"use client";

import { useEffect, useRef, useState } from "react";
import { Stage, Layer, Line, Rect, Circle, Group, Text } from "react-konva";
import type Konva from "konva";
import type { HassEntity } from "home-assistant-js-websocket";
import type { FloorPlanDoc, Wall, Opening, PlacedDevice, FurnitureItem, FloorArea } from "@/lib/floorplan/types";
import { newId } from "@/lib/floorplan/types";
import { iconOptionFor } from "@/lib/floorplan/icons";
import {
  GRID_STEP_CM,
  DEFAULT_WALL_THICKNESS,
  DEFAULT_DOOR_WIDTH,
  DEFAULT_WINDOW_WIDTH,
  DEFAULT_DEVICE_SIZE,
  cmToPx,
  pxToCm,
  snapCm,
  pointOnWall,
  wallAngleDeg,
  wallLength,
  projectPointToWall,
} from "@/lib/floorplan/geometry";
import { DEFAULT_FLOOR_FILL } from "@/lib/floorplan/floorPresets";
import { ACCENT } from "@/lib/theme";
import { DEFAULT_LAYER_STATE, layerForDevice, type LayerState } from "@/lib/floorplan/layers";
import { PropertiesPanel } from "./PropertiesPanel";
import { Ruler, RULER_SIZE } from "./Ruler";
import { DeviceNode } from "./DeviceNode";
import { FurnitureNode } from "./FurnitureNode";
import { FloorNode } from "./FloorNode";

export type EditMode = "select" | "floor" | "wall" | "door" | "window";

export type Selection =
  | { kind: "wall"; id: string }
  | { kind: "opening"; id: string }
  | { kind: "device"; id: string }
  | { kind: "furniture"; id: string }
  | { kind: "floor"; id: string }
  | null;

interface DrawingRect {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

interface Props {
  doc: FloorPlanDoc;
  onChange: (doc: FloorPlanDoc) => void;
  mode: EditMode;
  entities: HassEntity[];
  readOnly?: boolean;
  onEntityToggle?: (entityId: string) => void;
  showRulers?: boolean;
  layers?: LayerState;
}

const WALL_COLOR = "oklch(0.55 0.01 50)";
const WALL_SELECTED_COLOR = ACCENT;
const BG_COLOR = "oklch(0.23 0.012 50)";
const MIN_SCALE = 0.2;
const MAX_SCALE = 4;

function entityFor(entities: HassEntity[], entityId?: string): HassEntity | undefined {
  if (!entityId) return undefined;
  return entities.find((e) => e.entity_id === entityId);
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function FloorPlanCanvas({
  doc,
  onChange,
  mode,
  entities,
  readOnly = false,
  onEntityToggle,
  showRulers = false,
  layers = DEFAULT_LAYER_STATE,
}: Props) {
  const [selection, setSelection] = useState<Selection>(null);
  const [drawingWall, setDrawingWall] = useState<Wall | null>(null);
  const [drawingFloor, setDrawingFloor] = useState<DrawingRect | null>(null);
  const [panState, setPanState] = useState<{
    startX: number;
    startY: number;
    startPosX: number;
    startPosY: number;
  } | null>(null);
  const [size, setSize] = useState({ width: 900, height: 600 });
  const [scale, setScale] = useState(1);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const stageRef = useRef<Konva.Stage>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const centered = useRef(false);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      const width = entry.contentRect.width;
      const height = entry.contentRect.height;
      setSize({ width, height });
      if (!centered.current && width > 0 && height > 0) {
        centered.current = true;
        setPos({ x: width / 2, y: height / 2 });
      }
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  function pointerCm(): { x: number; y: number } | null {
    const stage = stageRef.current;
    const pos = stage?.getRelativePointerPosition();
    if (!pos) return null;
    return { x: snapCm(pxToCm(pos.x)), y: snapCm(pxToCm(pos.y)) };
  }

  function handleWheel(e: Konva.KonvaEventObject<WheelEvent>) {
    e.evt.preventDefault();
    const stage = stageRef.current;
    if (!stage) return;
    const pointer = stage.getPointerPosition();
    if (!pointer) return;

    const oldScale = scale;
    const mousePointTo = {
      x: (pointer.x - pos.x) / oldScale,
      y: (pointer.y - pos.y) / oldScale,
    };
    const direction = e.evt.deltaY > 0 ? -1 : 1;
    const scaleBy = 1.08;
    const newScale = clamp(
      direction > 0 ? oldScale * scaleBy : oldScale / scaleBy,
      MIN_SCALE,
      MAX_SCALE,
    );
    setScale(newScale);
    setPos({
      x: pointer.x - mousePointTo.x * newScale,
      y: pointer.y - mousePointTo.y * newScale,
    });
  }

  function handleStageMouseDown(e: Konva.KonvaEventObject<MouseEvent>) {
    // Middle mouse button always pans, regardless of the active tool.
    if (e.evt.button === 1) {
      e.evt.preventDefault();
      setPanState({ startX: e.evt.clientX, startY: e.evt.clientY, startPosX: pos.x, startPosY: pos.y });
      return;
    }
    if (readOnly) return;
    const cm = pointerCm();
    if (!cm) return;

    if (mode === "wall" && !layers.estrutura.locked) {
      setDrawingWall({ id: "preview", x1: cm.x, y1: cm.y, x2: cm.x, y2: cm.y, thickness: DEFAULT_WALL_THICKNESS });
    } else if (mode === "floor" && !layers.piso.locked) {
      setDrawingFloor({ x1: cm.x, y1: cm.y, x2: cm.x, y2: cm.y });
    } else if (mode === "select" && e.target === e.target.getStage()) {
      setSelection(null);
    }
  }

  function handleStageMouseMove(e: Konva.KonvaEventObject<MouseEvent>) {
    if (panState) {
      setPos({
        x: panState.startPosX + (e.evt.clientX - panState.startX),
        y: panState.startPosY + (e.evt.clientY - panState.startY),
      });
      return;
    }
    if (drawingWall) {
      const cm = pointerCm();
      if (cm) setDrawingWall({ ...drawingWall, x2: cm.x, y2: cm.y });
    }
    if (drawingFloor) {
      const cm = pointerCm();
      if (cm) setDrawingFloor({ ...drawingFloor, x2: cm.x, y2: cm.y });
    }
  }

  function handleStageMouseUp() {
    if (panState) {
      setPanState(null);
      return;
    }
    if (drawingWall) {
      if (wallLength(drawingWall) >= 20) {
        const wall: Wall = { ...drawingWall, id: newId("wall") };
        onChange({ ...doc, walls: [...doc.walls, wall] });
        setSelection({ kind: "wall", id: wall.id });
      }
      setDrawingWall(null);
    }
    if (drawingFloor) {
      const width = Math.abs(drawingFloor.x2 - drawingFloor.x1);
      const height = Math.abs(drawingFloor.y2 - drawingFloor.y1);
      if (width >= 20 && height >= 20) {
        const floor: FloorArea = {
          id: newId("floor"),
          x: (drawingFloor.x1 + drawingFloor.x2) / 2,
          y: (drawingFloor.y1 + drawingFloor.y2) / 2,
          width,
          height,
          rotation: 0,
          fill: DEFAULT_FLOOR_FILL,
          label: "Piso",
        };
        onChange({ ...doc, floors: [...doc.floors, floor] });
        setSelection({ kind: "floor", id: floor.id });
      }
      setDrawingFloor(null);
    }
  }

  function handleWallClick(wall: Wall, e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) {
    if (readOnly || layers.estrutura.locked) return;
    e.cancelBubble = true;

    if (mode === "door" || mode === "window") {
      const stage = stageRef.current;
      const relPos = stage?.getRelativePointerPosition();
      if (!relPos) return;
      const { t } = projectPointToWall(wall, pxToCm(relPos.x), pxToCm(relPos.y));
      const opening: Opening = {
        id: newId("opening"),
        wallId: wall.id,
        t,
        width: mode === "door" ? DEFAULT_DOOR_WIDTH : DEFAULT_WINDOW_WIDTH,
        kind: mode === "door" ? "door" : "window",
      };
      onChange({ ...doc, openings: [...doc.openings, opening] });
    } else if (mode === "select") {
      setSelection({ kind: "wall", id: wall.id });
    }
  }

  function handleOpeningClick(opening: Opening, e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) {
    if (readOnly || layers.estrutura.locked) return;
    e.cancelBubble = true;
    if (mode === "select") setSelection({ kind: "opening", id: opening.id });
  }

  function handleDeviceClick(device: PlacedDevice, e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) {
    e.cancelBubble = true;
    if (readOnly) {
      if (device.entityId) onEntityToggle?.(device.entityId);
      return;
    }
    if (layers[layerForDevice(device.icon)].locked) return;
    if (mode === "select") setSelection({ kind: "device", id: device.id });
  }

  function handleDeviceDragEnd(device: PlacedDevice, e: Konva.KonvaEventObject<DragEvent>) {
    const x = snapCm(pxToCm(e.target.x()));
    const y = snapCm(pxToCm(e.target.y()));
    onChange({
      ...doc,
      devices: doc.devices.map((d) => (d.id === device.id ? { ...d, x, y } : d)),
    });
  }

  function handleDeviceResize(device: PlacedDevice, width: number, height: number) {
    onChange({
      ...doc,
      devices: doc.devices.map((d) => (d.id === device.id ? { ...d, width, height } : d)),
    });
  }

  function handleFurnitureClick(item: FurnitureItem, e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) {
    e.cancelBubble = true;
    if (readOnly || layers.moveis.locked) return;
    if (mode === "select") setSelection({ kind: "furniture", id: item.id });
  }

  function handleFurnitureDragEnd(item: FurnitureItem, e: Konva.KonvaEventObject<DragEvent>) {
    const x = snapCm(pxToCm(e.target.x()));
    const y = snapCm(pxToCm(e.target.y()));
    onChange({
      ...doc,
      furniture: doc.furniture.map((f) => (f.id === item.id ? { ...f, x, y } : f)),
    });
  }

  function handleFurnitureResize(item: FurnitureItem, width: number, height: number) {
    onChange({
      ...doc,
      furniture: doc.furniture.map((f) => (f.id === item.id ? { ...f, width, height } : f)),
    });
  }

  function handleFloorClick(item: FloorArea, e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) {
    e.cancelBubble = true;
    if (readOnly || layers.piso.locked) return;
    if (mode === "select") setSelection({ kind: "floor", id: item.id });
  }

  function handleFloorDragEnd(item: FloorArea, e: Konva.KonvaEventObject<DragEvent>) {
    const x = snapCm(pxToCm(e.target.x()));
    const y = snapCm(pxToCm(e.target.y()));
    onChange({ ...doc, floors: doc.floors.map((f) => (f.id === item.id ? { ...f, x, y } : f)) });
  }

  function handleFloorResize(item: FloorArea, width: number, height: number) {
    onChange({
      ...doc,
      floors: doc.floors.map((f) => (f.id === item.id ? { ...f, width, height } : f)),
    });
  }

  function handleWallHandleDrag(wall: Wall, endpoint: 1 | 2, e: Konva.KonvaEventObject<DragEvent>) {
    const x = snapCm(pxToCm(e.target.x()));
    const y = snapCm(pxToCm(e.target.y()));
    onChange({
      ...doc,
      walls: doc.walls.map((w) =>
        w.id === wall.id
          ? endpoint === 1
            ? { ...w, x1: x, y1: y }
            : { ...w, x2: x, y2: y }
          : w,
      ),
    });
  }

  function handleWallBodyDragEnd(wall: Wall, e: Konva.KonvaEventObject<DragEvent>) {
    const dx = snapCm(pxToCm(e.target.x()));
    const dy = snapCm(pxToCm(e.target.y()));
    e.target.position({ x: 0, y: 0 });
    if (dx === 0 && dy === 0) return;
    onChange({
      ...doc,
      walls: doc.walls.map((w) =>
        w.id === wall.id
          ? { ...w, x1: w.x1 + dx, y1: w.y1 + dy, x2: w.x2 + dx, y2: w.y2 + dy }
          : w,
      ),
    });
  }

  function handleOpeningDragMove(wall: Wall, e: Konva.KonvaEventObject<DragEvent>) {
    const cmX = pxToCm(e.target.x());
    const cmY = pxToCm(e.target.y());
    const { t } = projectPointToWall(wall, cmX, cmY);
    const snapped = pointOnWall(wall, t);
    e.target.position({ x: cmToPx(snapped.x), y: cmToPx(snapped.y) });
  }

  function handleOpeningDragEnd(opening: Opening, wall: Wall, e: Konva.KonvaEventObject<DragEvent>) {
    const cmX = pxToCm(e.target.x());
    const cmY = pxToCm(e.target.y());
    const { t } = projectPointToWall(wall, cmX, cmY);
    onChange({
      ...doc,
      openings: doc.openings.map((o) => (o.id === opening.id ? { ...o, t } : o)),
    });
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    if (readOnly) return;
    const kind = e.dataTransfer.getData("kind");
    if (!kind) return;

    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const screenX = e.clientX - rect.left;
    const screenY = e.clientY - rect.top;
    const x = snapCm(pxToCm((screenX - pos.x) / scale));
    const y = snapCm(pxToCm((screenY - pos.y) / scale));

    if (kind === "furniture") {
      const imageUrl = e.dataTransfer.getData("imageUrl") || undefined;
      const label = e.dataTransfer.getData("label") || "Móvel";
      const item: FurnitureItem = {
        id: newId("furniture"),
        x,
        y,
        width: 100,
        height: 50,
        rotation: 0,
        imageUrl,
        label,
      };
      onChange({ ...doc, furniture: [...doc.furniture, item] });
      setSelection({ kind: "furniture", id: item.id });
      return;
    }

    const iconType = e.dataTransfer.getData("iconType");
    if (!iconType) return;
    const option = iconOptionFor(iconType as PlacedDevice["icon"]);
    const device: PlacedDevice = {
      id: newId("device"),
      x,
      y,
      width: DEFAULT_DEVICE_SIZE,
      height: DEFAULT_DEVICE_SIZE,
      rotation: 0,
      icon: option.type,
      label: option.label,
    };
    onChange({ ...doc, devices: [...doc.devices, device] });
    setSelection({ kind: "device", id: device.id });
  }

  function updateDevice(id: string, patch: Partial<PlacedDevice>) {
    onChange({
      ...doc,
      devices: doc.devices.map((d) => (d.id === id ? { ...d, ...patch } : d)),
    });
  }

  function updateWall(id: string, patch: Partial<Wall>) {
    onChange({ ...doc, walls: doc.walls.map((w) => (w.id === id ? { ...w, ...patch } : w)) });
  }

  function updateOpening(id: string, patch: Partial<Opening>) {
    onChange({
      ...doc,
      openings: doc.openings.map((o) => (o.id === id ? { ...o, ...patch } : o)),
    });
  }

  function updateFurniture(id: string, patch: Partial<FurnitureItem>) {
    onChange({
      ...doc,
      furniture: doc.furniture.map((f) => (f.id === id ? { ...f, ...patch } : f)),
    });
  }

  function updateFloor(id: string, patch: Partial<FloorArea>) {
    onChange({ ...doc, floors: doc.floors.map((f) => (f.id === id ? { ...f, ...patch } : f)) });
  }

  function deleteSelected() {
    if (!selection) return;
    if (selection.kind === "wall") {
      onChange({
        ...doc,
        walls: doc.walls.filter((w) => w.id !== selection.id),
        openings: doc.openings.filter((o) => o.wallId !== selection.id),
      });
    } else if (selection.kind === "opening") {
      onChange({ ...doc, openings: doc.openings.filter((o) => o.id !== selection.id) });
    } else if (selection.kind === "device") {
      onChange({ ...doc, devices: doc.devices.filter((d) => d.id !== selection.id) });
    } else if (selection.kind === "furniture") {
      onChange({ ...doc, furniture: doc.furniture.filter((f) => f.id !== selection.id) });
    } else if (selection.kind === "floor") {
      onChange({ ...doc, floors: doc.floors.filter((f) => f.id !== selection.id) });
    }
    setSelection(null);
  }

  const selectedWall =
    selection?.kind === "wall" ? doc.walls.find((w) => w.id === selection.id) : undefined;
  const selectedOpening =
    selection?.kind === "opening" ? doc.openings.find((o) => o.id === selection.id) : undefined;
  const selectedDevice =
    selection?.kind === "device" ? doc.devices.find((d) => d.id === selection.id) : undefined;
  const selectedFurniture =
    selection?.kind === "furniture" ? doc.furniture.find((f) => f.id === selection.id) : undefined;
  const selectedFloor =
    selection?.kind === "floor" ? doc.floors.find((f) => f.id === selection.id) : undefined;

  const gridStepPx = cmToPx(GRID_STEP_CM);
  const gridLinesX: number[] = [];
  const gridLinesY: number[] = [];
  if (size.width > 0) {
    const startX = Math.floor(-pos.x / scale / gridStepPx) * gridStepPx;
    const endX = (size.width - pos.x) / scale;
    for (let x = startX; x <= endX; x += gridStepPx) gridLinesX.push(x);
    const startY = Math.floor(-pos.y / scale / gridStepPx) * gridStepPx;
    const endY = (size.height - pos.y) / scale;
    for (let y = startY; y <= endY; y += gridStepPx) gridLinesY.push(y);
  }

  return (
    <div
      ref={containerRef}
      onDrop={handleDrop}
      onDragOver={(e) => e.preventDefault()}
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        background: BG_COLOR,
        borderRadius: readOnly ? 6 : 0,
        overflow: "hidden",
      }}
    >
      <Stage
        ref={stageRef}
        width={Math.max(size.width - (showRulers ? RULER_SIZE : 0), 0)}
        height={Math.max(size.height - (showRulers ? RULER_SIZE : 0), 0)}
        x={pos.x}
        y={pos.y}
        scaleX={scale}
        scaleY={scale}
        style={{
          position: "absolute",
          left: showRulers ? RULER_SIZE : 0,
          top: showRulers ? RULER_SIZE : 0,
          cursor: panState ? "grabbing" : "default",
        }}
        onWheel={handleWheel}
        onMouseDown={handleStageMouseDown}
        onMouseMove={handleStageMouseMove}
        onMouseUp={handleStageMouseUp}
        onMouseLeave={handleStageMouseUp}
      >
        <Layer>
          {/* floors — drawn first so everything else sits on top */}
          {layers.piso.visible &&
            doc.floors.map((item) => (
              <FloorNode
                key={item.id}
                item={item}
                selected={selection?.kind === "floor" && selection.id === item.id}
                readOnly={readOnly || layers.piso.locked}
                draggable={!readOnly && mode === "select" && !layers.piso.locked}
                listening={!layers.piso.locked}
                onClick={(e) => handleFloorClick(item, e)}
                onDragEnd={(e) => handleFloorDragEnd(item, e)}
                onResize={(w, h) => handleFloorResize(item, w, h)}
              />
            ))}

          {/* floor preview while drawing */}
          {drawingFloor && (
            <Rect
              x={cmToPx(Math.min(drawingFloor.x1, drawingFloor.x2))}
              y={cmToPx(Math.min(drawingFloor.y1, drawingFloor.y2))}
              width={cmToPx(Math.abs(drawingFloor.x2 - drawingFloor.x1))}
              height={cmToPx(Math.abs(drawingFloor.y2 - drawingFloor.y1))}
              fill={DEFAULT_FLOOR_FILL}
              opacity={0.6}
            />
          )}

          {/* grid */}
          {gridLinesX.map((x) => (
            <Line
              key={`gx-${x}`}
              points={[x, -100000, x, 100000]}
              stroke="oklch(0.32 0.014 50)"
              strokeWidth={1 / scale}
            />
          ))}
          {gridLinesY.map((y) => (
            <Line
              key={`gy-${y}`}
              points={[-100000, y, 100000, y]}
              stroke="oklch(0.32 0.014 50)"
              strokeWidth={1 / scale}
            />
          ))}

          {/* walls */}
          {layers.estrutura.visible &&
            doc.walls.map((wall) => (
              <Line
                key={wall.id}
                x={0}
                y={0}
                points={[cmToPx(wall.x1), cmToPx(wall.y1), cmToPx(wall.x2), cmToPx(wall.y2)]}
                stroke={selection?.kind === "wall" && selection.id === wall.id ? WALL_SELECTED_COLOR : WALL_COLOR}
                strokeWidth={cmToPx(wall.thickness)}
                lineCap="square"
                draggable={!readOnly && mode === "select" && !layers.estrutura.locked}
                listening={!layers.estrutura.locked}
                onClick={(e) => handleWallClick(wall, e)}
                onTap={(e) => handleWallClick(wall, e)}
                onDragEnd={(e) => handleWallBodyDragEnd(wall, e)}
              />
            ))}

          {/* openings */}
          {layers.estrutura.visible &&
            doc.openings.map((opening) => {
            const wall = doc.walls.find((w) => w.id === opening.wallId);
            if (!wall) return null;
            const center = pointOnWall(wall, opening.t);
            const angle = wallAngleDeg(wall);
            const color = opening.kind === "door" ? "oklch(0.7 0.13 70)" : "oklch(0.72 0.12 195)";
            return (
              <Group
                key={opening.id}
                x={cmToPx(center.x)}
                y={cmToPx(center.y)}
                rotation={angle}
                draggable={!readOnly && mode === "select" && !layers.estrutura.locked}
                listening={!layers.estrutura.locked}
                onClick={(e) => handleOpeningClick(opening, e)}
                onTap={(e) => handleOpeningClick(opening, e)}
                onDragMove={(e) => handleOpeningDragMove(wall, e)}
                onDragEnd={(e) => handleOpeningDragEnd(opening, wall, e)}
              >
                <Rect
                  x={-cmToPx(opening.width) / 2}
                  y={-cmToPx(wall.thickness) / 2 - 1}
                  width={cmToPx(opening.width)}
                  height={cmToPx(wall.thickness) + 2}
                  fill={BG_COLOR}
                />
                <Line
                  points={[-cmToPx(opening.width) / 2, 0, cmToPx(opening.width) / 2, 0]}
                  stroke={
                    selection?.kind === "opening" && selection.id === opening.id
                      ? WALL_SELECTED_COLOR
                      : color
                  }
                  strokeWidth={2}
                  dash={opening.kind === "window" ? [6, 4] : undefined}
                />
              </Group>
            );
          })}

          {/* wall endpoint handles */}
          {!readOnly && selectedWall && (
            <>
              <Circle
                x={cmToPx(selectedWall.x1)}
                y={cmToPx(selectedWall.y1)}
                radius={7 / scale}
                fill={WALL_SELECTED_COLOR}
                draggable
                onDragMove={(e) => handleWallHandleDrag(selectedWall, 1, e)}
              />
              <Circle
                x={cmToPx(selectedWall.x2)}
                y={cmToPx(selectedWall.y2)}
                radius={7 / scale}
                fill={WALL_SELECTED_COLOR}
                draggable
                onDragMove={(e) => handleWallHandleDrag(selectedWall, 2, e)}
              />
            </>
          )}

          {/* wall preview while drawing */}
          {drawingWall && (
            <>
              <Line
                points={[
                  cmToPx(drawingWall.x1),
                  cmToPx(drawingWall.y1),
                  cmToPx(drawingWall.x2),
                  cmToPx(drawingWall.y2),
                ]}
                stroke={WALL_SELECTED_COLOR}
                strokeWidth={cmToPx(DEFAULT_WALL_THICKNESS)}
                opacity={0.6}
                lineCap="square"
              />
              <Text
                text={`${(wallLength(drawingWall) / 100).toFixed(2)} m`}
                x={cmToPx((drawingWall.x1 + drawingWall.x2) / 2)}
                y={cmToPx((drawingWall.y1 + drawingWall.y2) / 2) - 20 / scale}
                fontSize={13 / scale}
                fill="oklch(0.97 0 0)"
              />
            </>
          )}

          {/* furniture */}
          {layers.moveis.visible &&
            doc.furniture.map((item) => (
              <FurnitureNode
                key={item.id}
                item={item}
                selected={selection?.kind === "furniture" && selection.id === item.id}
                readOnly={readOnly || layers.moveis.locked}
                draggable={!readOnly && mode === "select" && !layers.moveis.locked}
                listening={!layers.moveis.locked}
                onClick={(e) => handleFurnitureClick(item, e)}
                onDragEnd={(e) => handleFurnitureDragEnd(item, e)}
                onResize={(w, h) => handleFurnitureResize(item, w, h)}
              />
            ))}

          {/* devices */}
          {doc.devices
            .filter((device) => layers[layerForDevice(device.icon)].visible)
            .map((device) => {
              const deviceLayer = layers[layerForDevice(device.icon)];
              return (
                <DeviceNode
                  key={device.id}
                  device={device}
                  entity={entityFor(entities, device.entityId)}
                  selected={selection?.kind === "device" && selection.id === device.id}
                  readOnly={readOnly || deviceLayer.locked}
                  draggable={!readOnly && mode === "select" && !deviceLayer.locked}
                  listening={!deviceLayer.locked}
                  onClick={(e) => handleDeviceClick(device, e)}
                  onDragEnd={(e) => handleDeviceDragEnd(device, e)}
                  onResize={(w, h) => handleDeviceResize(device, w, h)}
                />
              );
            })}
        </Layer>
      </Stage>

      {showRulers && size.width > 0 && (
        <>
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: RULER_SIZE,
              height: RULER_SIZE,
              background: "oklch(0.26 0.013 50)",
              zIndex: 2,
            }}
          />
          <Ruler orientation="horizontal" scale={scale} offsetPx={pos.x} lengthPx={size.width - RULER_SIZE} />
          <Ruler orientation="vertical" scale={scale} offsetPx={pos.y} lengthPx={size.height - RULER_SIZE} />
        </>
      )}

      {!readOnly && selection && (
        <PropertiesPanel
          wall={selectedWall}
          opening={selectedOpening}
          device={selectedDevice}
          furniture={selectedFurniture}
          floor={selectedFloor}
          entities={entities}
          onUpdateWall={(patch) => selectedWall && updateWall(selectedWall.id, patch)}
          onUpdateOpening={(patch) => selectedOpening && updateOpening(selectedOpening.id, patch)}
          onUpdateDevice={(patch) => selectedDevice && updateDevice(selectedDevice.id, patch)}
          onUpdateFurniture={(patch) => selectedFurniture && updateFurniture(selectedFurniture.id, patch)}
          onUpdateFloor={(patch) => selectedFloor && updateFloor(selectedFloor.id, patch)}
          onDelete={deleteSelected}
          onClose={() => setSelection(null)}
        />
      )}
    </div>
  );
}
