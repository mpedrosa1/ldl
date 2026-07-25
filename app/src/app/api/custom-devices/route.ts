import { NextResponse } from "next/server";
import { createCustomDevice, listCustomDevices } from "@/lib/customDevices/store";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return NextResponse.json(await listCustomDevices());
  } catch (err) {
    console.error("[api/custom-devices] GET", err);
    return NextResponse.json({ error: "Could not list devices" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { name, icon, areaId, entityIds, isSwitch, cameraVisibility } = (body ?? {}) as Record<string, unknown>;

  if (typeof name !== "string" || !name.trim()) {
    return NextResponse.json({ error: "Nome é obrigatório" }, { status: 400 });
  }
  if (!Array.isArray(entityIds) || entityIds.length === 0 || !entityIds.every((e) => typeof e === "string")) {
    return NextResponse.json({ error: "Selecione ao menos uma entidade" }, { status: 400 });
  }

  try {
    const device = await createCustomDevice({
      name: name.trim(),
      icon: typeof icon === "string" && icon ? icon : undefined,
      areaId: typeof areaId === "string" && areaId ? areaId : undefined,
      entityIds,
      isSwitch: isSwitch === true,
      cameraVisibility:
        cameraVisibility && typeof cameraVisibility === "object" && !Array.isArray(cameraVisibility)
          ? (cameraVisibility as Record<string, boolean>)
          : undefined,
    });
    return NextResponse.json(device);
  } catch (err) {
    console.error("[api/custom-devices] POST", err);
    return NextResponse.json({ error: "Could not save device" }, { status: 500 });
  }
}
