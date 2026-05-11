import { FilePlus, FileText } from "lucide-react";
import { Chip } from "@heroui/react";
import type { Part } from "@opencode-ai/sdk/client";
import { ToolCard, ErrorBlock, getDuration } from "./ToolCard";

type ToolPart = Extract<Part, { type: "tool" }>;

interface WriteInput {
  filePath?: string;
  content?: string;
}

interface WriteMetadata {
  /** opencode marks new files via metadata.created (true) vs overwrite (false). */
  created?: boolean;
}

function basename(path: string): string {
  const idx = Math.max(path.lastIndexOf("/"), path.lastIndexOf("\\"));
  return idx >= 0 ? path.slice(idx + 1) : path;
}

export function WriteTool({ part }: { part: ToolPart }) {
  const input = part.state.input as WriteInput;
  const meta =
    (part.state.status === "completed" || part.state.status === "running"
      ? (part.state.metadata as WriteMetadata | undefined)
      : undefined) ?? {};
  const created = meta.created === true;
  const overwrite = meta.created === false;

  const file = input.filePath ?? "";
  const content = input.content ?? "";
  const lineCount = content ? content.split("\n").length : 0;

  return (
    <ToolCard
      tool="write"
      icon={
        created ? (
          <FilePlus className="h-3.5 w-3.5 text-success" />
        ) : (
          <FileText className="h-3.5 w-3.5 text-default-500" />
        )
      }
      status={part.state.status}
      title={file ? basename(file) : "write"}
      durationMs={getDuration(part.state)}
      trailing={
        <span className="flex items-center gap-1">
          {created && (
            <Chip
              size="sm"
              variant="flat"
              color="success"
              className="h-4 text-[10px]"
              data-testid="write-created-badge"
            >
              created
            </Chip>
          )}
          {overwrite && (
            <Chip
              size="sm"
              variant="flat"
              color="warning"
              className="h-4 text-[10px]"
              data-testid="write-overwrite-badge"
            >
              overwritten
            </Chip>
          )}
          {lineCount > 0 && (
            <span className="text-[10px] tabular-nums text-default-400">
              {lineCount} lines
            </span>
          )}
        </span>
      }
    >
      {file && (
        <div className="break-all font-mono text-[11px] text-default-500" data-testid="write-file">
          {file}
        </div>
      )}
      {content && (
        <pre
          className="max-h-64 overflow-auto whitespace-pre-wrap break-words rounded-medium bg-background p-2 font-mono text-[11px]"
          data-testid="write-content"
        >
          {content}
        </pre>
      )}
      {part.state.status === "error" && <ErrorBlock message={part.state.error} />}
    </ToolCard>
  );
}
