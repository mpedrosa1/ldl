import { deleteAutomation, updateAutomation } from "@/lib/automations/store";
import { reloadAutomations } from "@/lib/automations/engine";
import type { Automation } from "@/lib/automations/types";

export const dynamic = "force-dynamic";

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = (await request.json().catch(() => null)) as Partial<Automation> | null;
  if (!body) return Response.json({ error: "Corpo inválido" }, { status: 400 });

  const patch: Partial<Omit<Automation, "id">> = {};
  if (body.name !== undefined) patch.name = body.name.trim();
  if (body.enabled !== undefined) patch.enabled = body.enabled;
  if (body.trigger !== undefined) patch.trigger = body.trigger;
  if (body.blocks !== undefined) patch.blocks = body.blocks;

  const updated = await updateAutomation(id, patch);
  if (!updated) return Response.json({ error: "Automação não encontrada" }, { status: 404 });

  await reloadAutomations();
  return Response.json(updated);
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const removed = await deleteAutomation(id);
  if (!removed) return Response.json({ error: "Automação não encontrada" }, { status: 404 });

  await reloadAutomations();
  return Response.json({ ok: true });
}
