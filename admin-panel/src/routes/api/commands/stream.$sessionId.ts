import { createFileRoute } from "@tanstack/react-router";
import { subscribe, getSession } from "@/lib/command-runner";
import { authMiddleware } from "@/lib/auth-middleware";
import type { SSEEvent } from "@/lib/command-runner";

export const Route = createFileRoute("/api/commands/stream/$sessionId")({
  server: {
    middleware: [authMiddleware],
    handlers: {
      GET: async ({ request, params }) => {
        const { sessionId } = params;
        const session = getSession(sessionId);

        if (!session) {
          return Response.json(
            { error: "Session not found" },
            {
              status: 404,
            },
          );
        }

        const stream = new ReadableStream({
          start(controller) {
            const encoder = new TextEncoder();

            function send(event: SSEEvent) {
              try {
                controller.enqueue(
                  encoder.encode(`data: ${JSON.stringify(event)}\n\n`),
                );
                if (event.type === "done" || event.type === "error") {
                  controller.close();
                }
              } catch {
                // Controller already closed
              }
            }

            const unsubscribe = subscribe(sessionId, send);

            // Cleanup on client disconnect
            request.signal.addEventListener("abort", () => {
              unsubscribe();
            });
          },
        });

        return new Response(stream, {
          headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            Connection: "keep-alive",
          },
        });
      },
    },
  },
});
