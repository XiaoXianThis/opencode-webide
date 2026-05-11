import { useMemo } from "react";
import { FileEdit } from "lucide-react";
import { Chip } from "@heroui/react";
import type { Part } from "@opencode-ai/sdk/client";
import { ToolCard, ErrorBlock, getDuration } from "./ToolCard";
import { diffLines, countDiff, type DiffOp } from "./diff";
import { cn } from "@/lib/utils";

type ToolPart = Extract<Part, { type: "tool" }>;

interface EditInput {
  filePath?: string;
  oldString?: string;
  newString?: string;
  replaceAll?: boolean;
}

function basename(path: string): string {
  const idx = Math.max(path.lastIndexOf("/"), path.lastIndexOf("\\"));
  return idx >= 0 ? path.slice(idx + 1) : path;
}

export function EditTool({ part }: { part: ToolPart }) {
  const input = part.state.input as EditInput;
  const ops = useMemo<DiffOp[]>(
    () => diffLines(input.oldString ?? "", input.newString ?? ""),
    [input.oldString, input.newString],
  );
  const { added, removed } = countDiff(ops);

  const file = input.filePath ?? "";
  const title = file ? basename(file) : "edit";

  return (
    <ToolCard
      tool="edit"
      icon={<FileEdit className="h-3.5 w-3.5 text-default-500" />}
      status={part.state.status}
      title={title}
      durationMs={getDuration(part.state)}
      trailing={
        <span className="flex items-center gap-1 text-[10px] tabular-nums">
          {added > 0 && (
            <span className="text-success" data-testid="edit-added">
              +{added}
            </span>
          )}
          {removed > 0 && (
            <span className="text-danger" data-testid="edit-removed">
              -{removed}
            </span>
          )}
          {input.replaceAll && (
            <Chip size="sm" variant="flat" className="h-4 text-[10px]">
              all
            </Chip>
          )}
        </span>
      }
    >
      {file && (
        <div className="break-all font-mono text-[11px] text-default-500" data-testid="edit-file">
          {file}
        </div>
      )}
      <DiffView ops={ops} />
      {part.state.status === "error" && <ErrorBlock message={part.state.error} />}
    </ToolCard>
  );
}

function DiffView({ ops }: { ops: DiffOp[] }) {
  if (ops.length === 0) {
    return (
      <div className="rounded-medium bg-background p-2 text-[11px] text-default-500">
        (no changes)
      </div>
    );
  }
  return (
    <div className="overflow-x-auto rounded-medium bg-background font-mono text-[11px]" data-testid="edit-diff">
      {ops.map((op, i) => (
        <div
          key={i}
          data-op={op.type}
          className={cn(
            "flex gap-2 px-2 leading-5",
            op.type === "add" && "bg-success/10 text-success",
            op.type === "remove" && "bg-danger/10 text-danger",
            op.type === "equal" && "text-default-500",
          )}
        >
          <span className="w-4 select-none text-default-400">
            {op.type === "add" ? "+" : op.type === "remove" ? "-" : " "}
          </span>
          <span className="whitespace-pre-wrap break-words">{op.line}</span>
        </div>
      ))}
    </div>
  );
}
