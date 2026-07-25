import { NextResponse } from "next/server";
import { getHaConfig } from "@/lib/ha/client";

export const dynamic = "force-dynamic";

interface LogbookEntry {
  when: string;
  name: string;
  message?: string;
  entity_id?: string;
  domain?: string;
  state?: string;
}

// Relays real Home Assistant Logbook entries (last 24h) — this is the
// "Registro de atividades" feed in the design, backed by actual state
// changes instead of fabricated events.
export async function GET() {
  try {
    const { hassUrl, accessToken } = getHaConfig();
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const res = await fetch(`${hassUrl}/api/logbook/${since}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: "no-store",
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: `Home Assistant respondeu ${res.status}` },
        { status: 502 },
      );
    }

    const entries: LogbookEntry[] = await res.json();
    entries.reverse(); // HA returns oldest-first; newest-first reads better as a feed
    return NextResponse.json(entries.slice(0, 30));
  } catch (err) {
    console.error("[api/ha/logbook]", err);
    return NextResponse.json(
      { error: "Could not reach Home Assistant" },
      { status: 502 },
    );
  }
}
