import { Chip } from "@heroui/react";
import type { Part } from "@opencode-ai/sdk/client";

export function GenericPartView({ part }: { part: Part }) {
  return (
    <Chip
      size="sm"
      variant="bordered"
      className="h-5 border-dashed text-[10px] text-default-500"
    >
      {part.type}
    </Chip>
  );
}
