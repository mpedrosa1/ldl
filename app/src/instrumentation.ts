/**
 * `register()` roda uma vez quando o servidor Next sobe — é o gancho que
 * liga o motor de automações. Sem isso as automações só rodariam por acaso,
 * quando alguma requisição importasse o módulo.
 */
export async function register() {
  // O arquivo também é avaliado no runtime Edge, que não tem acesso a
  // websocket persistente nem ao sistema de arquivos.
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  const { startAutomationEngine } = await import("@/lib/automations/engine");
  await startAutomationEngine();
}
