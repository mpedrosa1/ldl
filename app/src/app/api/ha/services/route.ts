import { NextResponse } from "next/server";
import { callService } from "home-assistant-js-websocket";
import { getHaConnection } from "@/lib/ha/client";

interface ServiceCallBody {
  domain: string;
  service: string;
  entity_id?: string | string[];
  data?: Record<string, unknown>;
}

export async function POST(request: Request) {
  let body: ServiceCallBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { domain, service, entity_id, data } = body;
  if (!domain || !service) {
    return NextResponse.json(
      { error: "'domain' and 'service' are required" },
      { status: 400 },
    );
  }

  try {
    const connection = await getHaConnection();
    await callService(
      connection,
      domain,
      service,
      data ?? {},
      entity_id ? { entity_id } : undefined,
    );
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[api/ha/services]", err);
    return NextResponse.json(
      { error: "Service call failed" },
      { status: 502 },
    );
  }
}
