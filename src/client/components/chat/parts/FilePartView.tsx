import { Paperclip } from "lucide-react";
import { Chip } from "@heroui/react";
import type { Part } from "@opencode-ai/sdk/client";

type FilePartT = Extract<Part, { type: "file" }>;

export function FilePartView({ part }: { part: FilePartT }) {
  return (
    <div className="flex items-center gap-2 rounded-medium border border-default-200 bg-content2/40 px-2 py-1 text-xs">
      <Paperclip className="h-3.5 w-3.5 text-default-500" />
      <span className="truncate font-mono text-foreground">{part.filename ?? part.url}</span>
      <Chip size="sm" variant="flat" className="ml-auto h-5 text-[10px]">
        {part.mime}
      </Chip>
    </div>
  );
}
