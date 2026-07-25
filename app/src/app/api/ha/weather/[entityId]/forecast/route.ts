import { NextResponse } from "next/server";
import { getHaConnection } from "@/lib/ha/client";

export const dynamic = "force-dynamic";

interface ForecastResponse {
  response: Record<string, { forecast: unknown[] }>;
}

// Modern HA weather entities don't carry the forecast in their state anymore
// (deprecated) — it's fetched on demand via the `weather.get_forecasts`
// service, called through the websocket "call_service ... return_response"
// mechanism (the same one HA's own frontend uses for the forecast dialog).
export async function GET(
  request: Request,
  { params }: { params: Promise<{ entityId: string }> },
) {
  const { entityId } = await params;
  const url = new URL(request.url);
  const type = url.searchParams.get("type") === "hourly" ? "hourly" : "daily";

  try {
    const connection = await getHaConnection();
    const result = await connection.sendMessagePromise<ForecastResponse>({
      type: "call_service",
      domain: "weather",
      service: "get_forecasts",
      service_data: { type },
      target: { entity_id: entityId },
      return_response: true,
    });
    return NextResponse.json({ forecast: result.response[entityId]?.forecast ?? [] });
  } catch (err) {
    console.error(`[api/ha/weather/${entityId}/forecast]`, err);
    return NextResponse.json({ error: "Could not fetch forecast" }, { status: 502 });
  }
}
