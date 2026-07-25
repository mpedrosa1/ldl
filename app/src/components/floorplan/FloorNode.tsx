import { Circle, Group, Image, Rect } from "react-konva";
import type Konva from "konva";
import type { FloorArea } from "@/lib/floorplan/types";
import { cmToPx, pxToCm, snapCm } from "@/lib/floorplan/geometry";
import { MIN_ITEM_SIZE_CM } from "@/lib/floorplan/geometry";
import { useHtmlImage } from "@/hooks/useHtmlImage";
import { ACCENT } from "@/lib/theme";

export function FloorNode({
  item,
  selected,
  readOnly,
  draggable,
  listening = true,
  onClick,
  onDragEnd,
  onResize,
}: {
  item: FloorArea;
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
        <Rect x={-w / 2} y={-h / 2} width={w} height={h} fill={item.fill} />
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
                const newW = Math.max(MIN_ITEM_SIZE_CM, snapCm(pxToCm(e.target.x()) * 2));
                const newH = Math.max(MIN_ITEM_SIZE_CM, snapCm(pxToCm(e.target.y()) * 2));
                onResize(newW, newH);
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
