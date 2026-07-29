import { Readable } from "node:stream";
import { getCameraFull } from "@/lib/tapo/store";
import { buildRtspUrl, redactRtspCredentials, spawnFmp4Stream } from "@/lib/tapo/ffmpeg";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const camera = await getCameraFull(id);
  if (!camera) return new Response("Camera not found", { status: 404 });

  // Qualidade escolhida ao vivo pelo player (botão HD/SD), não mais na hora de
  // cadastrar a câmera. Padrão é SD (stream2): o vídeo é copiado sem
  // recodificar, e a resolução menor ajuda a manter a taxa de bits (e a
  // decodificação no navegador) leve.
  const url = new URL(request.url);
  const quality = url.searchParams.get("quality") === "hd" ? "stream1" : "stream2";
  const proc = spawnFmp4Stream(buildRtspUrl({ ...camera, streamPath: quality }));

  let stderr = "";
  proc.stderr.on("data", (chunk: Buffer) => {
    stderr += chunk.toString();
  });
  proc.on("error", (err) => {
    console.error(`[tapo-cameras/${id}/stream] ffmpeg error`, err);
  });
  proc.on("close", (code) => {
    if (code !== 0 && code !== null) {
      console.error(
        `[tapo-cameras/${id}/stream] ffmpeg exited with ${code}: ${redactRtspCredentials(stderr.slice(-500))}`,
      );
    }
  });

  const stop = () => {
    if (!proc.killed) proc.kill("SIGKILL");
  };
  request.signal.addEventListener("abort", stop);
  proc.stdout.on("close", stop);

  return new Response(Readable.toWeb(proc.stdout) as ReadableStream, {
    headers: {
      "Content-Type": "video/mp4",
      "Cache-Control": "no-store",
    },
  });
}
