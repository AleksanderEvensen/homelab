import { createFileRoute } from "@tanstack/react-router";
import { json } from "@tanstack/react-start";
import { sendStdin, getSession } from "@/lib/command-runner";
import { authMiddleware } from "@/lib/auth-middleware";

export const Route = createFileRoute("/api/commands/stdin/$sessionId")({
  server: {
    middleware: [authMiddleware],
    handlers: {
      POST: async ({ request, params }) => {
        const { sessionId } = params;
        const session = getSession(sessionId);

        if (!session) {
          return json({ error: "Session not found" }, { status: 404 });
        }

        const body = (await request.json()) as { input: string };

        try {
          sendStdin(sessionId, body.input);
          return json({ ok: true });
        } catch (err) {
          return json(
            { error: err instanceof Error ? err.message : "Failed to send input" },
            { status: 500 },
          );
        }
      },
    },
  },
});
