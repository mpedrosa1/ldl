import { NextResponse } from "next/server";
import { deleteCamera, updateCamera, type StreamQuality, type TapoCamera } from "@/lib/tapo/store";

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

  const { name, host, username, password, streamPath } = (body ?? {}) as Record<string, unknown>;
  const patch: Partial<Omit<TapoCamera, "id">> = {};
  if (typeof name === "string" && name.trim()) patch.name = name.trim();
  if (typeof host === "string" && host.trim()) patch.host = host.trim();
  if (typeof username === "string" && username) patch.username = username;
  if (typeof password === "string" && password) patch.password = password;
  if (streamPath === "stream1" || streamPath === "stream2") {
    patch.streamPath = streamPath as StreamQuality;
  }

  try {
    const updated = await updateCamera(id, patch);
    if (!updated) return NextResponse.json({ error: "Câmera não encontrada" }, { status: 404 });
    return NextResponse.json(updated);
  } catch (err) {
    console.error("[api/tapo-cameras/:id] PUT", err);
    return NextResponse.json({ error: "Could not update camera" }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  try {
    const ok = await deleteCamera(id);
    if (!ok) return NextResponse.json({ error: "Câmera não encontrada" }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[api/tapo-cameras/:id] DELETE", err);
    return NextResponse.json({ error: "Could not delete camera" }, { status: 500 });
  }
}
