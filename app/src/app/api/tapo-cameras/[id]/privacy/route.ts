import { getCameraFull } from "@/lib/tapo/store";
import { getPrivacyMode, setPrivacyMode } from "@/lib/tapo/api";

export const dynamic = "force-dynamic";

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : "Não foi possível falar com a câmera";
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const camera = await getCameraFull(id);
  if (!camera) return Response.json({ error: "Câmera não encontrada" }, { status: 404 });

  try {
    return Response.json({ enabled: await getPrivacyMode(camera) });
  } catch (err) {
    console.error(`[tapo-cameras/${id}/privacy] GET`, err);
    return Response.json({ error: errorMessage(err) }, { status: 502 });
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const camera = await getCameraFull(id);
  if (!camera) return Response.json({ error: "Câmera não encontrada" }, { status: 404 });

  const body = await request.json().catch(() => null);
  if (typeof body?.enabled !== "boolean") {
    return Response.json({ error: "Campo 'enabled' (boolean) é obrigatório" }, { status: 400 });
  }

  try {
    await setPrivacyMode(camera, body.enabled);
    return Response.json({ enabled: body.enabled });
  } catch (err) {
    console.error(`[tapo-cameras/${id}/privacy] POST`, err);
    return Response.json({ error: errorMessage(err) }, { status: 502 });
  }
}
