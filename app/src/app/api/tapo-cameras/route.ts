import { NextResponse } from "next/server";
import { createCamera, listCamerasPublic, type StreamQuality } from "@/lib/tapo/store";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return NextResponse.json(await listCamerasPublic());
  } catch (err) {
    console.error("[api/tapo-cameras] GET", err);
    return NextResponse.json({ error: "Could not list cameras" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { name, host, username, password, streamPath } = (body ?? {}) as Record<string, unknown>;

  if (typeof name !== "string" || !name.trim()) {
    return NextResponse.json({ error: "Nome é obrigatório" }, { status: 400 });
  }
  if (typeof host !== "string" || !host.trim()) {
    return NextResponse.json({ error: "IP/host é obrigatório" }, { status: 400 });
  }
  if (typeof username !== "string" || !username) {
    return NextResponse.json({ error: "Usuário da conta de câmera é obrigatório" }, { status: 400 });
  }
  if (typeof password !== "string" || !password) {
    return NextResponse.json({ error: "Senha da conta de câmera é obrigatória" }, { status: 400 });
  }

  const quality: StreamQuality = streamPath === "stream2" ? "stream2" : "stream1";

  try {
    const camera = await createCamera({
      name: name.trim(),
      host: host.trim(),
      username,
      password,
      streamPath: quality,
    });
    return NextResponse.json(camera);
  } catch (err) {
    console.error("[api/tapo-cameras] POST", err);
    return NextResponse.json({ error: "Could not save camera" }, { status: 500 });
  }
}
