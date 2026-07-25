import { NextResponse } from "next/server";
import { getEntities } from "@/lib/ha/client";

export async function GET() {
  try {
    const entities = await getEntities();
    return NextResponse.json(Object.values(entities));
  } catch (err) {
    console.error("[api/ha/states]", err);
    return NextResponse.json(
      { error: "Could not reach Home Assistant" },
      { status: 502 },
    );
  }
}
