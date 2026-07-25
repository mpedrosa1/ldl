import { getCameraFull } from "@/lib/tapo/store";
import { buildRtspUrl, captureSnapshot } from "@/lib/tapo/ffmpeg";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const camera = await getCameraFull(id);
  if (!camera) return new Response("Camera not found", { status: 404 });

  try {
    const jpeg = await captureSnapshot(buildRtspUrl(camera));
    return new Response(new Uint8Array(jpeg), {
      headers: { "Content-Type": "image/jpeg", "Cache-Control": "no-store" },
    });
  } catch (err) {
    console.error(`[tapo-cameras/${id}/snapshot]`, err);
    return new Response("Could not reach camera", { status: 502 });
  }
}
