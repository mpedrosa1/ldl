import { subscribeEntities } from "home-assistant-js-websocket";
import { getHaConnection } from "@/lib/ha/client";

export const dynamic = "force-dynamic";

// Server-Sent Events bridge: relays Home Assistant entity state changes to
// the browser so the dashboard updates live without polling or exposing the
// HA token client-side.
export async function GET(request: Request) {
  const encoder = new TextEncoder();
  let unsubscribe: (() => void) | undefined;

  const stream = new ReadableStream({
    async start(controller) {
      const send = (payload: unknown) => {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify(payload)}\n\n`),
        );
      };

      try {
        const connection = await getHaConnection();
        unsubscribe = subscribeEntities(connection, (entities) => {
          send(Object.values(entities));
        });
      } catch (err) {
        console.error("[api/ha/stream]", err);
        send({ error: "Could not reach Home Assistant" });
        controller.close();
        return;
      }

      request.signal.addEventListener("abort", () => {
        unsubscribe?.();
        controller.close();
      });
    },
    cancel() {
      unsubscribe?.();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
