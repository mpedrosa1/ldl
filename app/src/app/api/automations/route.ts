import { createAutomation, listAutomations } from "@/lib/automations/store";
import { reloadAutomations } from "@/lib/automations/engine";
import type { Automation } from "@/lib/automations/types";

export const dynamic = "force-dynamic";

export async function GET() {
  return Response.json(await listAutomations());
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as Partial<Automation> | null;
  if (!body?.name?.trim() || !body.trigger) {
    return Response.json({ error: "Nome e gatilho são obrigatórios" }, { status: 400 });
  }

  const automation = await createAutomation({
    name: body.name.trim(),
    enabled: body.enabled ?? true,
    trigger: body.trigger,
    blocks: body.blocks ?? [],
  });
  await reloadAutomations();
  return Response.json(automation, { status: 201 });
}
