import { NextResponse } from "next/server";
import { getAreaAssignments } from "@/lib/ha/registry";

export async function GET() {
  try {
    const data = await getAreaAssignments();
    return NextResponse.json(data);
  } catch (err) {
    console.error("[api/ha/areas]", err);
    return NextResponse.json(
      { error: "Could not reach Home Assistant" },
      { status: 502 },
    );
  }
}
