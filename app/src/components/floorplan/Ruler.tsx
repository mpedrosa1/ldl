import { PX_PER_CM, cmToPx, niceTickStepCm } from "@/lib/floorplan/geometry";
import { BORDER, TEXT_MUTED_3 } from "@/lib/theme";

export const RULER_SIZE = 24;

interface RulerProps {
  orientation: "horizontal" | "vertical";
  scale: number;
  offsetPx: number; // stagePos.x for horizontal, stagePos.y for vertical
  lengthPx: number; // container width (horizontal) or height (vertical)
}

function formatCm(cm: number): string {
  if (cm === 0) return "0";
  return Math.abs(cm) % 100 === 0 ? `${cm / 100}m` : `${cm}cm`;
}

export function Ruler({ orientation, scale, offsetPx, lengthPx }: RulerProps) {
  const pxPerCm = PX_PER_CM * scale;
  const stepCm = niceTickStepCm(pxPerCm);

  const visibleStartCm = -offsetPx / pxPerCm;
  const visibleEndCm = (lengthPx - offsetPx) / pxPerCm;

  const firstTick = Math.floor(visibleStartCm / stepCm) * stepCm;
  const ticks: number[] = [];
  for (let cm = firstTick; cm <= visibleEndCm; cm += stepCm) {
    ticks.push(cm);
  }

  const isHorizontal = orientation === "horizontal";

  return (
    <div
      style={{
        position: "absolute",
        top: isHorizontal ? 0 : RULER_SIZE,
        left: isHorizontal ? RULER_SIZE : 0,
        width: isHorizontal ? lengthPx : RULER_SIZE,
        height: isHorizontal ? RULER_SIZE : lengthPx,
        background: "oklch(0.26 0.013 50)",
        borderBottom: isHorizontal ? `1px solid ${BORDER}` : undefined,
        borderRight: !isHorizontal ? `1px solid ${BORDER}` : undefined,
        overflow: "hidden",
        pointerEvents: "none",
      }}
    >
      {ticks.map((cm) => {
        const posPx = offsetPx + cmToPx(cm) * scale;
        return (
          <div
            key={cm}
            style={{
              position: "absolute",
              top: isHorizontal ? 0 : posPx,
              left: isHorizontal ? posPx : 0,
              width: isHorizontal ? 1 : RULER_SIZE,
              height: isHorizontal ? RULER_SIZE : 1,
              background: BORDER,
            }}
          >
            <span
              style={{
                position: "absolute",
                top: isHorizontal ? 2 : -6,
                left: isHorizontal ? 3 : 3,
                fontSize: 9,
                color: TEXT_MUTED_3,
                whiteSpace: "nowrap",
                writingMode: isHorizontal ? undefined : "vertical-rl",
              }}
            >
              {formatCm(cm)}
            </span>
          </div>
        );
      })}
    </div>
  );
}
