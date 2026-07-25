import { Circle, Group, Image, Rect, Text } from "react-konva";
import type Konva from "konva";
import type { FurnitureItem } from "@/lib/floorplan/types";
import { cmToPx, pxToCm, snapCm } from "@/lib/floorplan/geometry";
import { useHtmlImage } from "@/hooks/useHtmlImage";
import { ACCENT } from "@/lib/theme";

const MIN_SIZE_CM = 20;

export function FurnitureNode({
  item,
  selected,
  readOnly,
  draggable,
  listening = true,
  onClick,
  onDragEnd,
  onResize,
}: {
  item: FurnitureItem;
  selected: boolean;
  readOnly: boolean;
  draggable: boolean;
  listening?: boolean;
  onClick: (e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => void;
  onDragEnd: (e: Konva.KonvaEventObject<DragEvent>) => void;
  onResize: (width: number, height: number) => void;
}) {
  const img = useHtmlImage(item.imageUrl);
  const w = cmToPx(item.width);
  const h = cmToPx(item.height);

  return (
    <Group
      x={cmToPx(item.x)}
      y={cmToPx(item.y)}
      rotation={item.rotation}
      draggable={draggable}
      listening={listening}
      onClick={onClick}
      onTap={onClick}
      onDragEnd={onDragEnd}
    >
      {img ? (
        // eslint-disable-next-line jsx-a11y/alt-text -- Konva.Image is a canvas shape, not a DOM <img>
        <Image image={img} x={-w / 2} y={-h / 2} width={w} height={h} />
      ) : (
        <>
          <Rect
            x={-w / 2}
            y={-h / 2}
            width={w}
            height={h}
            fill="oklch(0.30 0.015 50)"
            stroke="oklch(0.42 0.02 50)"
            dash={[6, 4]}
            cornerRadius={4}
          />
          <Text
            text={item.label}
            x={-w / 2}
            y={-6}
            width={w}
            align="center"
            fontSize={11}
            fill="oklch(0.65 0.01 50)"
          />
        </>
      )}

      {selected && (
        <>
          <Rect x={-w / 2} y={-h / 2} width={w} height={h} stroke={ACCENT} strokeWidth={2} listening={false} />
          {!readOnly && (
            <Circle
              x={w / 2}
              y={h / 2}
              radius={7}
              fill={ACCENT}
              draggable
              onDragMove={(e) => {
                const newWidthCm = Math.max(MIN_SIZE_CM, snapCm(pxToCm(e.target.x()) * 2));
                const newHeightCm = Math.max(MIN_SIZE_CM, snapCm(pxToCm(e.target.y()) * 2));
                onResize(newWidthCm, newHeightCm);
              }}
              onDragEnd={(e) => {
                e.target.position({ x: cmToPx(item.width) / 2, y: cmToPx(item.height) / 2 });
              }}
            />
          )}
        </>
      )}
    </Group>
  );
}
