import { getHaConfig } from "@/lib/ha/client";

export const dynamic = "force-dynamic";

// Proxies a single JPEG snapshot from Home Assistant's camera_proxy endpoint.
// Keeps HA_TOKEN server-side instead of putting it in an <img src> URL.
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ entityId: string }> },
) {
  const { entityId } = await params;
  const { hassUrl, accessToken } = getHaConfig();

  const res = await fetch(
    `${hassUrl}/api/camera_proxy/${encodeURIComponent(entityId)}`,
    { headers: { Authorization: `Bearer ${accessToken}` }, cache: "no-store" },
  );

  if (!res.ok || !res.body) {
    return new Response("Could not reach camera", { status: 502 });
  }

  return new Response(res.body, {
    headers: {
      "Content-Type": res.headers.get("Content-Type") ?? "image/jpeg",
      "Cache-Control": "no-store",
    },
  });
}
