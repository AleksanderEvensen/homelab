import type { Subprocess } from "bun";

export type CommandType = "git-pull" | "nixos-rebuild";

export interface CommandSession {
  id: string;
  command: CommandType;
  proc: Subprocess;
  output: string[];
  status: "running" | "done" | "error";
  exitCode?: number;
  startTime: number;
  duration?: number;
  listeners: Set<(event: SSEEvent) => void>;
}

export type SSEEvent =
  | { type: "output"; text: string }
  | { type: "sudo_prompt" }
  | { type: "done"; exitCode: number; duration: number }
  | { type: "error"; message: string };

const sessions = new Map<string, CommandSession>();
let activeSessionId: string | null = null;

const TIMEOUTS: Record<CommandType, number> = {
  "git-pull": 60_000,
  "nixos-rebuild": 600_000,
};

function getCommandArgs(command: CommandType, cwd: string): string[] {
  switch (command) {
    case "git-pull":
      return ["git", "-C", cwd, "pull"];
    case "nixos-rebuild":
      return ["sudo", "nixos-rebuild", "switch"];
    default:
      throw new Error(`Unknown command: ${command}`);
  }
}

function isSudoPrompt(text: string): boolean {
  const lower = text.toLowerCase();
  return (
    lower.includes("[sudo] password") ||
    lower.includes("password for") ||
    lower.includes("password:")
  );
}

function emit(session: CommandSession, event: SSEEvent) {
  for (const listener of session.listeners) {
    try {
      listener(event);
    } catch {
      session.listeners.delete(listener);
    }
  }
}

async function readStream(stream: ReadableStream<Uint8Array>, session: CommandSession) {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const text = decoder.decode(value, { stream: true });
      session.output.push(text);

      if (isSudoPrompt(text)) {
        emit(session, { type: "sudo_prompt" });
      } else {
        emit(session, { type: "output", text });
      }
    }
  } catch {
    // Stream closed
  }
}

export function startCommand(command: CommandType, cwd: string): string {
  if (activeSessionId) {
    const active = sessions.get(activeSessionId);
    if (active && active.status === "running") {
      throw new Error("A command is already running");
    }
  }

  const id = crypto.randomUUID();
  const args = getCommandArgs(command, cwd);

  const proc = Bun.spawn(args, {
    cwd: command === "nixos-rebuild" ? cwd : undefined,
    stdout: "pipe",
    stderr: "pipe",
    stdin: "pipe",
  });

  const session: CommandSession = {
    id,
    command,
    proc,
    output: [],
    status: "running",
    startTime: Date.now(),
    listeners: new Set(),
  };

  sessions.set(id, session);
  activeSessionId = id;

  // Read stdout and stderr concurrently
  const stdoutPromise = proc.stdout ? readStream(proc.stdout, session) : Promise.resolve();
  const stderrPromise = proc.stderr ? readStream(proc.stderr, session) : Promise.resolve();

  // Set timeout
  const timeout = setTimeout(() => {
    if (session.status === "running") {
      proc.kill();
      session.status = "error";
      emit(session, {
        type: "error",
        message: `Command timed out after ${TIMEOUTS[command] / 1000}s`,
      });
    }
  }, TIMEOUTS[command]);

  // Wait for process to exit
  proc.exited.then(async (exitCode) => {
    clearTimeout(timeout);
    // Wait for streams to finish
    await Promise.all([stdoutPromise, stderrPromise]);
    session.exitCode = exitCode;
    session.duration = Date.now() - session.startTime;
    session.status = exitCode === 0 ? "done" : "error";
    activeSessionId = null;
    emit(session, { type: "done", exitCode, duration: session.duration });

    // Cleanup after 5 minutes
    setTimeout(() => {
      sessions.delete(id);
    }, 300_000);
  });

  return id;
}

export function getSession(sessionId: string): CommandSession | undefined {
  return sessions.get(sessionId);
}

export function subscribe(sessionId: string, listener: (event: SSEEvent) => void): () => void {
  const session = sessions.get(sessionId);
  if (!session) throw new Error("Session not found");

  // Send buffered output
  for (const text of session.output) {
    if (isSudoPrompt(text)) {
      listener({ type: "sudo_prompt" });
    } else {
      listener({ type: "output", text });
    }
  }

  // If already done, send completion immediately
  if (session.status !== "running") {
    listener({
      type: "done",
      exitCode: session.exitCode ?? 1,
      duration: session.duration ?? 0,
    });
    return () => {};
  }

  session.listeners.add(listener);
  return () => {
    session.listeners.delete(listener);
  };
}

export function sendStdin(sessionId: string, input: string): void {
  const session = sessions.get(sessionId);
  if (!session) throw new Error("Session not found");
  if (session.status !== "running") throw new Error("Command is not running");

  const writer = session.proc.stdin as WritableStream<Uint8Array>;
  const w = writer.getWriter();
  w.write(new TextEncoder().encode(input + "\n"));
  w.releaseLock();
}

export function isCommandRunning(): boolean {
  if (!activeSessionId) return false;
  const session = sessions.get(activeSessionId);
  return session?.status === "running" ?? false;
}
