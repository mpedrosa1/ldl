import { getHaConfig } from "@/lib/ha/client";

export const dynamic = "force-dynamic";

// Proxies the MJPEG (multipart/x-mixed-replace) live stream from Home
// Assistant's camera_proxy_stream endpoint. Browsers render this natively
// in a plain <img src="..."> tag, no player library needed.
export async function GET(
  request: Request,
  { params }: { params: Promise<{ entityId: string }> },
) {
  const { entityId } = await params;
  const { hassUrl, accessToken } = getHaConfig();

  const res = await fetch(
    `${hassUrl}/api/camera_proxy_stream/${encodeURIComponent(entityId)}`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
      signal: request.signal,
    },
  );

  if (!res.ok || !res.body) {
    return new Response("Could not reach camera", { status: 502 });
  }

  return new Response(res.body, {
    headers: {
      "Content-Type":
        res.headers.get("Content-Type") ?? "multipart/x-mixed-replace",
      "Cache-Control": "no-store",
    },
  });
}
