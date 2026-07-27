import { getAutomation } from "@/lib/automations/store";
import { runAutomation } from "@/lib/automations/engine";

export const dynamic = "force-dynamic";

/** "Executar agora" — roda a automação ignorando o gatilho e devolve o
 * resultado, para o usuário testar o que montou sem esperar o disparo real. */
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const automation = await getAutomation(id);
  if (!automation) return Response.json({ error: "Automação não encontrada" }, { status: 404 });

  return Response.json(await runAutomation(automation));
}
