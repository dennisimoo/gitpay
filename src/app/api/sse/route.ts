import { NextRequest } from "next/server";
import { addSSEClient, removeSSEClient } from "@/lib/events";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const encoder = new TextEncoder();
  const clientId = Math.random().toString(36).slice(2);

  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "connected" })}\n\n`));

      addSSEClient(clientId, (data: string) => {
        try {
          controller.enqueue(encoder.encode(`data: ${data}\n\n`));
        } catch {
          removeSSEClient(clientId);
        }
      });

      // Heartbeat every 20s
      const heartbeat = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`: heartbeat\n\n`));
        } catch {
          clearInterval(heartbeat);
        }
      }, 20_000);

      request.signal.addEventListener("abort", () => {
        clearInterval(heartbeat);
        removeSSEClient(clientId);
      });
    },
    cancel() {
      removeSSEClient(clientId);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
