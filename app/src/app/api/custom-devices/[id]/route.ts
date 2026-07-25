import { NextResponse } from "next/server";
import { deleteCustomDevice, updateCustomDevice, type CustomDevice } from "@/lib/customDevices/store";

export const dynamic = "force-dynamic";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { name, icon, areaId, entityIds, isSwitch, cameraVisibility } = (body ?? {}) as Record<string, unknown>;
  const patch: Partial<Omit<CustomDevice, "id">> = {};
  if (typeof name === "string" && name.trim()) patch.name = name.trim();
  if (typeof icon === "string") patch.icon = icon || undefined;
  if (typeof areaId === "string") patch.areaId = areaId || undefined;
  if (Array.isArray(entityIds) && entityIds.every((e) => typeof e === "string")) {
    patch.entityIds = entityIds;
  }
  if (typeof isSwitch === "boolean") patch.isSwitch = isSwitch;
  if (cameraVisibility && typeof cameraVisibility === "object" && !Array.isArray(cameraVisibility)) {
    patch.cameraVisibility = cameraVisibility as Record<string, boolean>;
  }

  try {
    const updated = await updateCustomDevice(id, patch);
    if (!updated) return NextResponse.json({ error: "Dispositivo não encontrado" }, { status: 404 });
    return NextResponse.json(updated);
  } catch (err) {
    console.error("[api/custom-devices/:id] PUT", err);
    return NextResponse.json({ error: "Could not update device" }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  try {
    const ok = await deleteCustomDevice(id);
    if (!ok) return NextResponse.json({ error: "Dispositivo não encontrado" }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[api/custom-devices/:id] DELETE", err);
    return NextResponse.json({ error: "Could not delete device" }, { status: 500 });
  }
}
