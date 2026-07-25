import { getEntities, getHaConfig } from "@/lib/ha/client";

export const dynamic = "force-dynamic";

// Proxies a media_player's current artwork/app background (`entity_picture`
// attribute) — same reasoning as the camera snapshot proxy: HA paths need the
// bearer token attached server-side, which we never want to expose to the browser.
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ entityId: string }> },
) {
  const { entityId } = await params;
  const entities = await getEntities();
  const picture = entities[entityId]?.attributes.entity_picture as string | undefined;
  if (!picture) return new Response("No picture", { status: 404 });

  const { hassUrl, accessToken } = getHaConfig();
  const isRelative = picture.startsWith("/");
  const url = isRelative ? `${hassUrl}${picture}` : picture;

  try {
    const res = await fetch(url, {
      headers: isRelative ? { Authorization: `Bearer ${accessToken}` } : undefined,
    });
    if (!res.ok || !res.body) {
      return new Response("Could not reach Home Assistant", { status: 502 });
    }
    return new Response(res.body, {
      headers: {
        "Content-Type": res.headers.get("Content-Type") ?? "image/jpeg",
        "Cache-Control": "private, max-age=30",
      },
    });
  } catch (err) {
    console.error(`[api/ha/media-picture/${entityId}]`, err);
    return new Response("Could not reach Home Assistant", { status: 502 });
  }
}
