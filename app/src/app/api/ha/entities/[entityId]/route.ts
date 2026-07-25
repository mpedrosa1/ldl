import { NextResponse } from "next/server";
import { renameEntity } from "@/lib/ha/registry";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ entityId: string }> },
) {
  const { entityId } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { name } = (body ?? {}) as Record<string, unknown>;
  if (typeof name !== "string" || !name.trim()) {
    return NextResponse.json({ error: "Nome é obrigatório" }, { status: 400 });
  }

  try {
    await renameEntity(entityId, name.trim());
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[api/ha/entities/:id] PUT", err);
    return NextResponse.json({ error: "Could not rename entity in Home Assistant" }, { status: 502 });
  }
}
