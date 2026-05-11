import { useState } from "react";
import { FileText } from "lucide-react";
import { Button } from "@heroui/react";
import type { Part } from "@opencode-ai/sdk/client";
import { ToolCard, ErrorBlock, getDuration } from "./ToolCard";

type ToolPart = Extract<Part, { type: "tool" }>;

interface ReadInput {
  filePath?: string;
  offset?: number;
  limit?: number;
}

const PREVIEW_LINES = 5;

function basename(path: string): string {
  const idx = Math.max(path.lastIndexOf("/"), path.lastIndexOf("\\"));
  return idx >= 0 ? path.slice(idx + 1) : path;
}

export function ReadTool({ part }: { part: ToolPart }) {
  const input = part.state.input as ReadInput;
  const file = input.filePath ?? "";
  const output = part.state.status === "completed" ? part.state.output : "";
  const lines = output ? output.split("\n") : [];
  const [expanded, setExpanded] = useState(false);
  const showAll = expanded || lines.length <= PREVIEW_LINES;
  const visible = showAll ? lines : lines.slice(0, PREVIEW_LINES);

  return (
    <ToolCard
      tool="read"
      icon={<FileText className="h-3.5 w-3.5 text-default-500" />}
      status={part.state.status}
      title={file ? basename(file) : "read"}
      durationMs={getDuration(part.state)}
      trailing={
        lines.length > 0 && (
          <span className="text-[10px] tabular-nums text-default-400" data-testid="read-line-count">
            {lines.length} lines
          </span>
        )
      }
    >
      {file && (
        <div className="break-all font-mono text-[11px] text-default-500" data-testid="read-file">
          {file}
        </div>
      )}
      {visible.length > 0 && (
        <pre
          className="max-h-64 overflow-auto rounded-medium bg-background p-2 font-mono text-[11px]"
          data-testid="read-content"
        >
          {visible.map((line, i) => (
            <div key={i} className="flex gap-2">
              <span className="w-8 shrink-0 select-none text-right text-default-400">
                {(input.offset ?? 0) + i + 1}
              </span>
              <span className="whitespace-pre-wrap break-words">{line}</span>
            </div>
          ))}
        </pre>
      )}
      {!showAll && (
        <Button
          size="sm"
          variant="flat"
          onPress={() => setExpanded(true)}
          className="h-6 text-[11px]"
          data-testid="read-expand"
        >
          展开全部 {lines.length} 行
        </Button>
      )}
      {part.state.status === "error" && <ErrorBlock message={part.state.error} />}
    </ToolCard>
  );
}
