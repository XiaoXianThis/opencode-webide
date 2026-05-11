import type { Part } from "@opencode-ai/sdk/client";
import { TextPartView } from "./parts/TextPartView";
import { ReasoningPartView } from "./parts/ReasoningPartView";
import { ToolPartView } from "./parts/ToolPartView";
import { FilePartView } from "./parts/FilePartView";
import { StepDividerView } from "./parts/StepDividerView";
import { GenericPartView } from "./parts/GenericPartView";

export function PartRenderer({ part }: { part: Part }) {
  switch (part.type) {
    case "text":
      if (part.synthetic || part.ignored) return null;
      return <TextPartView part={part} />;
    case "reasoning":
      return <ReasoningPartView part={part} />;
    case "tool":
      return <ToolPartView part={part} />;
    case "file":
      return <FilePartView part={part} />;
    case "step-start":
    case "step-finish":
      return <StepDividerView part={part} />;
    case "snapshot":
    case "patch":
    case "agent":
    case "subtask":
    case "retry":
    case "compaction":
      return <GenericPartView part={part} />;
    default:
      return null;
  }
}
