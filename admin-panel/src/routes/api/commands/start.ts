import { createFileRoute } from "@tanstack/react-router";
import { json } from "@tanstack/react-start";
import { startCommand, isCommandRunning } from "@/lib/command-runner";
import { env } from "@/env";
import type { CommandType } from "@/lib/command-runner";
import { authMiddleware } from "@/lib/auth-middleware";

export const Route = createFileRoute("/api/commands/start")({
  server: {
    middleware: [authMiddleware],
    handlers: {
      POST: async ({ request }) => {
        if (isCommandRunning()) {
          return json({ error: "A command is already running" }, { status: 409 });
        }

        const body = (await request.json()) as { command: string };
        const command = body.command as CommandType;

        if (command !== "git-pull" && command !== "nixos-rebuild") {
          return json({ error: "Invalid command" }, { status: 400 });
        }

        try {
          const sessionId = startCommand(command, env.HOMELAB_REPO_PATH);
          return json({ sessionId });
        } catch (err) {
          return json(
            { error: err instanceof Error ? err.message : "Failed to start command" },
            { status: 500 },
          );
        }
      },
    },
  },
});
