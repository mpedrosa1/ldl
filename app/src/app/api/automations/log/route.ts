import { getRunLog, getVariables } from "@/lib/automations/engine";

export const dynamic = "force-dynamic";

export async function GET() {
  return Response.json({ runs: getRunLog(), variables: getVariables() });
}
