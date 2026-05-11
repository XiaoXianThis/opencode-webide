import { Terminal } from "lucide-react";
import { Chip } from "@heroui/react";
import type { Part } from "@opencode-ai/sdk/client";
import { ToolCard, ErrorBlock, getDuration } from "./ToolCard";

type ToolPart = Extract<Part, { type: "tool" }>;

interface BashInput {
  command?: string;
  description?: string;
}

interface BashMetadata {
  exit?: number;
  stderr?: string;
}

export function BashTool({ part }: { part: ToolPart }) {
  const input = part.state.input as BashInput;
  const meta =
    (part.state.status === "completed" || part.state.status === "running"
      ? (part.state.metadata as BashMetadata | undefined)
      : undefined) ?? {};
  const exit = meta.exit;

  const trailing =
    exit !== undefined ? (
      <Chip
        size="sm"
        variant="flat"
        color={exit === 0 ? "success" : "danger"}
        className="h-4 text-[10px]"
        data-testid="bash-exit"
      >
        exit {exit}
      </Chip>
    ) : undefined;

  const stdout =
    part.state.status === "completed" ? part.state.output : undefined;

  return (
    <ToolCard
      tool="bash"
      icon={<Terminal className="h-3.5 w-3.5 text-default-500" />}
      status={part.state.status}
      title={input.description ?? input.command ?? "bash"}
      durationMs={getDuration(part.state)}
      trailing={trailing}
    >
      {input.command && (
        <div>
          <div className="mb-1 text-[10px] uppercase tracking-wide text-default-500">
            command
          </div>
          <pre
            className="overflow-x-auto rounded-medium bg-background p-2 font-mono text-[11px] text-foreground"
            data-testid="bash-command"
          >
            {`$ ${input.command}`}
          </pre>
        </div>
      )}
      {stdout !== undefined && (
        <div>
          <div className="mb-1 text-[10px] uppercase tracking-wide text-default-500">
            stdout
          </div>
          <pre
            className="max-h-64 overflow-auto whitespace-pre-wrap break-words rounded-medium bg-black/60 p-2 font-mono text-[11px] text-default-200"
            data-testid="bash-stdout"
          >
            {stdout || "(empty)"}
          </pre>
        </div>
      )}
      {meta.stderr && (
        <div>
          <div className="mb-1 text-[10px] uppercase tracking-wide text-warning">
            stderr
          </div>
          <pre
            className="max-h-48 overflow-auto whitespace-pre-wrap break-words rounded-medium bg-warning/10 p-2 font-mono text-[11px] text-warning"
            data-testid="bash-stderr"
          >
            {meta.stderr}
          </pre>
        </div>
      )}
      {part.state.status === "error" && <ErrorBlock message={part.state.error} />}
    </ToolCard>
  );
}
