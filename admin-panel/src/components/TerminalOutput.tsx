import { useRef, useEffect, useState } from "react";

interface TerminalOutputProps {
  lines: string[];
  isRunning: boolean;
  exitCode?: number;
  duration?: number;
  error?: string;
  sudoPromptVisible?: boolean;
  onSudoPassword?: (password: string) => void;
}

export default function TerminalOutput({
  lines,
  isRunning,
  exitCode,
  duration,
  error,
  sudoPromptVisible,
  onSudoPassword,
}: TerminalOutputProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);
  const [sudoInput, setSudoInput] = useState("");

  // Auto-scroll to bottom when new lines arrive
  useEffect(() => {
    if (autoScroll && containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [lines, autoScroll]);

  // Detect manual scroll to pause auto-scroll
  const handleScroll = () => {
    if (!containerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 20;
    setAutoScroll(isAtBottom);
  };

  const handleSudoSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (sudoInput && onSudoPassword) {
      onSudoPassword(sudoInput);
      setSudoInput("");
    }
  };

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`;
  };

  return (
    <div className="border border-neutral-800 bg-neutral-950 overflow-hidden">
      {/* Terminal header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-neutral-900 border-b border-neutral-800">
        <div className="flex items-center gap-2">
          <div className="flex gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-red-500/60" />
            <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/60" />
            <div className="w-2.5 h-2.5 rounded-full bg-green-500/60" />
          </div>
          <span className="text-[11px] text-neutral-500 ml-2">output</span>
        </div>
        <div className="flex items-center gap-2">
          {isRunning && (
            <span className="text-[11px] text-amber-400 flex items-center gap-1">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
              running
            </span>
          )}
          {!autoScroll && (
            <button
              onClick={() => {
                setAutoScroll(true);
                if (containerRef.current) {
                  containerRef.current.scrollTop = containerRef.current.scrollHeight;
                }
              }}
              className="text-[11px] text-neutral-400 hover:text-neutral-200 transition-colors"
            >
              scroll to bottom
            </button>
          )}
        </div>
      </div>

      {/* Terminal body */}
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="p-3 h-64 overflow-y-auto font-mono text-xs leading-relaxed text-neutral-300 scroll-smooth"
      >
        {lines.length === 0 && isRunning && (
          <span className="text-neutral-600">Waiting for output...</span>
        )}
        {lines.map((line, i) => (
          <div key={i} className="whitespace-pre-wrap break-all">
            {line}
          </div>
        ))}

        {/* Sudo password prompt */}
        {sudoPromptVisible && onSudoPassword && (
          <form onSubmit={handleSudoSubmit} className="flex items-center gap-2 mt-1">
            <span className="text-amber-400">[sudo] password:</span>
            <input
              type="password"
              value={sudoInput}
              onChange={(e) => setSudoInput(e.target.value)}
              className="flex-1 bg-transparent border-none outline-none text-xs text-neutral-300 caret-amber-400"
              autoFocus
            />
          </form>
        )}

        {/* Error */}
        {error && <div className="text-red-400 mt-1">{error}</div>}
      </div>

      {/* Status bar */}
      {exitCode !== undefined && (
        <div className="flex items-center justify-between px-3 py-1.5 bg-neutral-900 border-t border-neutral-800 text-[11px]">
          <span className={exitCode === 0 ? "text-emerald-400" : "text-red-400"}>
            exit {exitCode}
          </span>
          {duration !== undefined && (
            <span className="text-neutral-500">{formatDuration(duration)}</span>
          )}
        </div>
      )}
    </div>
  );
}
