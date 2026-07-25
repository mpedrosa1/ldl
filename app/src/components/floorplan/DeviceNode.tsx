import { Circle, Group, Image, Text } from "react-konva";
import type Konva from "konva";
import type { HassEntity } from "home-assistant-js-websocket";
import type { PlacedDevice } from "@/lib/floorplan/types";
import { iconOptionFor } from "@/lib/floorplan/icons";
import { cmToPx, pxToCm, snapCm, DEFAULT_DEVICE_SIZE, MIN_ITEM_SIZE_CM } from "@/lib/floorplan/geometry";
import { augmentDevice } from "@/lib/ha/devices";
import { useHtmlImage } from "@/hooks/useHtmlImage";
import { ACCENT, MUTED } from "@/lib/theme";

export function DeviceNode({
  device,
  entity,
  selected,
  readOnly,
  draggable,
  listening = true,
  onClick,
  onDragEnd,
  onResize,
}: {
  device: PlacedDevice;
  entity?: HassEntity;
  selected: boolean;
  readOnly: boolean;
  draggable: boolean;
  listening?: boolean;
  onClick: (e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => void;
  onDragEnd: (e: Konva.KonvaEventObject<DragEvent>) => void;
  onResize: (width: number, height: number) => void;
}) {
  const img = useHtmlImage(device.imageUrl);
  const option = iconOptionFor(device.icon);
  const augmented = entity ? augmentDevice(entity) : null;
  const statusColor = device.entityId ? ((augmented?.isOn ?? false) ? ACCENT : MUTED) : "oklch(0.4 0.015 50)";

  const widthCm = device.width ?? DEFAULT_DEVICE_SIZE;
  const heightCm = device.height ?? DEFAULT_DEVICE_SIZE;
  const w = cmToPx(widthCm);
  const h = cmToPx(heightCm);

  return (
    <Group
      x={cmToPx(device.x)}
      y={cmToPx(device.y)}
      draggable={draggable}
      listening={listening}
      onClick={onClick}
      onTap={onClick}
      onDragEnd={onDragEnd}
    >
      {/* Only the icon/image (and its resize handle) rotates — the label below stays upright and readable. */}
      <Group rotation={device.rotation}>
        {img ? (
          <>
            {/* eslint-disable-next-line jsx-a11y/alt-text -- Konva.Image is a canvas shape, not a DOM <img> */}
            <Image image={img} x={-w / 2} y={-h / 2} width={w} height={h} />
            <Circle x={w / 2 - 3} y={-h / 2 + 3} radius={4} fill={statusColor} />
          </>
        ) : (
          <>
            <Circle
              radius={Math.min(w, h) / 2}
              fill="oklch(0.28 0.014 50)"
              stroke={selected ? ACCENT : statusColor}
              strokeWidth={selected ? 3 : 2}
            />
            <Text
              text={option.emoji}
              fontSize={Math.min(w, h) * 0.5}
              x={-w / 2}
              y={-h / 2}
              width={w}
              height={h}
              align="center"
              verticalAlign="middle"
            />
          </>
        )}
        {selected && (
          <Circle radius={Math.max(w, h) / 2 + 6} stroke={ACCENT} strokeWidth={2} listening={false} />
        )}
        {selected && !readOnly && (
          <Circle
            x={w / 2}
            y={h / 2}
            radius={7}
            fill={ACCENT}
            draggable
            onDragMove={(e) => {
              const newW = Math.max(MIN_ITEM_SIZE_CM, snapCm(pxToCm(e.target.x()) * 2));
              const newH = Math.max(MIN_ITEM_SIZE_CM, snapCm(pxToCm(e.target.y()) * 2));
              onResize(newW, newH);
            }}
            onDragEnd={(e) => {
              e.target.position({ x: cmToPx(widthCm) / 2, y: cmToPx(heightCm) / 2 });
            }}
          />
        )}
      </Group>
      <Text
        text={device.label}
        fontSize={10}
        fill="oklch(0.85 0.006 50)"
        x={-40}
        y={Math.max(h, 32) / 2 + 8}
        width={80}
        align="center"
      />
    </Group>
  );
}
