import type { ReactNode } from "react";
import { Loader2, CircleCheck, CircleX, Clock } from "lucide-react";
import { Disclosure } from "@heroui/react";
import type { ToolState } from "@opencode-ai/sdk/client";
import { cn } from "@/lib/utils";

const STATUS_ICON = {
  pending: Clock,
  running: Loader2,
  completed: CircleCheck,
  error: CircleX,
} as const;

const STATUS_COLOR = {
  pending: "text-default-500",
  running: "text-warning animate-spin",
  completed: "text-success",
  error: "text-danger",
} as const;

export function formatDuration(ms: number): string {
  if (!Number.isFinite(ms) || ms < 0) return "";
  if (ms < 1000) return `${Math.round(ms)}ms`;
  const sec = ms / 1000;
  if (sec < 60) return `${sec.toFixed(sec < 10 ? 1 : 0)}s`;
  const m = Math.floor(sec / 60);
  const s = Math.round(sec - m * 60);
  return `${m}m${s}s`;
}

export interface ToolCardProps {
  /** Tool identifier (e.g. "bash", "edit"). Rendered as a monospace pill. */
  tool: string;
  /** Optional icon to the left of the tool name. */
  icon?: ReactNode;
  status: ToolState["status"];
  /** Free-form title (usually `state.title`, defaults to tool name). */
  title?: string;
  /** Duration in ms; if provided, shown subtly in the header. */
  durationMs?: number;
  /** Extra trailing content rendered before the status icon. */
  trailing?: ReactNode;
  /** Body content (per-tool view). */
  children?: ReactNode;
  /** Force a ring tone (e.g. error tools always red). */
  tone?: "default" | "danger";
  /** Pass-through to react-aria Disclosure. */
  defaultExpanded?: boolean;
}

/**
 * Shared frame for every per-tool view. Owns the disclosure header
 * (status icon + title + duration) and the bordered body wrapper.
 */
export function ToolCard({
  tool,
  icon,
  status,
  title,
  durationMs,
  trailing,
  children,
  tone = "default",
  defaultExpanded,
}: ToolCardProps) {
  const StatusIcon = STATUS_ICON[status];
  const displayTitle = title ?? tool;

  return (
    <Disclosure
      data-tool={tool}
      data-status={status}
      defaultExpanded={defaultExpanded}
      className={cn(
        "rounded-medium border bg-content2/40",
        tone === "danger" ? "border-danger/40" : "border-default-200",
      )}
    >
      <Disclosure.Heading>
        <Disclosure.Trigger className="flex w-full items-center gap-2 px-2 py-1.5 text-xs">
          {icon}
          <span className="font-mono text-foreground">{tool}</span>
          <span className="flex-1 truncate text-left text-default-500">
            {displayTitle}
          </span>
          {durationMs !== undefined && durationMs > 0 && (
            <span className="text-[10px] tabular-nums text-default-400">
              {formatDuration(durationMs)}
            </span>
          )}
          {trailing}
          <StatusIcon
            className={cn("h-3.5 w-3.5", STATUS_COLOR[status])}
            aria-label={status}
          />
          <Disclosure.Indicator />
        </Disclosure.Trigger>
      </Disclosure.Heading>
      <Disclosure.Content>
        <Disclosure.Body className="space-y-2 border-t border-default-200 p-2 text-xs">
          {children}
        </Disclosure.Body>
      </Disclosure.Content>
    </Disclosure>
  );
}

/**
 * Convenience: pretty-print a JSON value inside a `<pre>` block.
 * Used by GenericTool and as a fallback when a per-tool view doesn't
 * recognise the input shape.
 */
export function JsonBlock({ value, label }: { value: unknown; label?: string }) {
  return (
    <div>
      {label && (
        <div className="mb-1 text-[10px] uppercase tracking-wide text-default-500">
          {label}
        </div>
      )}
      <pre className="overflow-x-auto rounded-medium bg-background p-2 font-mono text-[11px]">
        {JSON.stringify(value, null, 2)}
      </pre>
    </div>
  );
}

export function ErrorBlock({ message }: { message: string }) {
  return (
    <div role="alert">
      <div className="mb-1 text-[10px] uppercase tracking-wide text-danger">error</div>
      <pre className="overflow-x-auto whitespace-pre-wrap break-words rounded-medium bg-danger/10 p-2 font-mono text-[11px] text-danger">
        {message}
      </pre>
    </div>
  );
}

export function getDuration(state: ToolState): number | undefined {
  if (state.status === "completed" || state.status === "error") {
    return state.time.end - state.time.start;
  }
  return undefined;
}
