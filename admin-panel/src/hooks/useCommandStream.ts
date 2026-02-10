import { useState, useCallback, useRef } from "react";

export type CommandType = "git-pull" | "nixos-rebuild";

interface CommandStreamState {
  lines: string[];
  isRunning: boolean;
  exitCode?: number;
  duration?: number;
  sudoPromptVisible: boolean;
  error?: string;
}

export function useCommandStream() {
  const [state, setState] = useState<CommandStreamState>({
    lines: [],
    isRunning: false,
    sudoPromptVisible: false,
  });
  const sessionIdRef = useRef<string | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  const start = useCallback(async (command: CommandType) => {
    // Reset state
    setState({
      lines: [],
      isRunning: true,
      exitCode: undefined,
      duration: undefined,
      sudoPromptVisible: false,
      error: undefined,
    });

    try {
      const res = await fetch("/api/commands/start", {
        method: "POST",
        body: JSON.stringify({ command }),
        headers: { "Content-Type": "application/json" },
      });

      if (!res.ok) {
        const data = await res.json();
        setState((prev) => ({
          ...prev,
          isRunning: false,
          error: data.error || "Failed to start command",
        }));
        return;
      }

      const { sessionId } = await res.json();
      sessionIdRef.current = sessionId;

      const eventSource = new EventSource(`/api/commands/stream/${sessionId}`);
      eventSourceRef.current = eventSource;

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          switch (data.type) {
            case "output":
              setState((prev) => ({
                ...prev,
                lines: [...prev.lines, data.text],
              }));
              break;
            case "sudo_prompt":
              setState((prev) => ({
                ...prev,
                sudoPromptVisible: true,
              }));
              break;
            case "done":
              setState((prev) => ({
                ...prev,
                isRunning: false,
                exitCode: data.exitCode,
                duration: data.duration,
              }));
              eventSource.close();
              break;
            case "error":
              setState((prev) => ({
                ...prev,
                isRunning: false,
                error: data.message,
              }));
              eventSource.close();
              break;
          }
        } catch {
          // Ignore parse errors
        }
      };

      eventSource.onerror = () => {
        setState((prev) => {
          if (prev.isRunning) {
            return {
              ...prev,
              isRunning: false,
              error: "Connection lost",
            };
          }
          return prev;
        });
        eventSource.close();
      };
    } catch (err) {
      setState((prev) => ({
        ...prev,
        isRunning: false,
        error: err instanceof Error ? err.message : "Failed to start command",
      }));
    }
  }, []);

  const sendPassword = useCallback(async (password: string) => {
    const sessionId = sessionIdRef.current;
    if (!sessionId) return;

    setState((prev) => ({ ...prev, sudoPromptVisible: false }));

    try {
      await fetch(`/api/commands/stdin/${sessionId}`, {
        method: "POST",
        body: JSON.stringify({ input: password }),
        headers: { "Content-Type": "application/json" },
      });
    } catch {
      setState((prev) => ({
        ...prev,
        error: "Failed to send password",
      }));
    }
  }, []);

  const stop = useCallback(() => {
    eventSourceRef.current?.close();
    setState((prev) => ({ ...prev, isRunning: false }));
  }, []);

  return {
    ...state,
    start,
    sendPassword,
    stop,
  };
}
