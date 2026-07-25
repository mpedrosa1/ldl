import { NextResponse } from "next/server";
import { readFloorPlan, writeFloorPlan } from "@/lib/floorplan/store";
import { EMPTY_FLOOR_PLAN, type FloorPlanDoc } from "@/lib/floorplan/types";

export const dynamic = "force-dynamic";

function isValidDoc(value: unknown): value is Partial<FloorPlanDoc> {
  if (!value || typeof value !== "object") return false;
  const doc = value as Record<string, unknown>;
  return Array.isArray(doc.walls) && Array.isArray(doc.openings) && Array.isArray(doc.devices);
}

export async function GET() {
  try {
    const doc = await readFloorPlan();
    return NextResponse.json(doc);
  } catch (err) {
    console.error("[api/floorplan] GET", err);
    return NextResponse.json({ error: "Could not read floor plan" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!isValidDoc(body)) {
    return NextResponse.json(
      { error: "Body must be { walls: [], openings: [], devices: [] }" },
      { status: 400 },
    );
  }

  try {
    await writeFloorPlan({ ...EMPTY_FLOOR_PLAN, ...body });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[api/floorplan] PUT", err);
    return NextResponse.json({ error: "Could not save floor plan" }, { status: 500 });
  }
}
