import { Terminal } from "lucide-react";
import { Chip } from "@heroui/react";

export function TopBar() {
  return (
    <header className="flex h-10 shrink-0 items-center gap-2 border-b border-default-200 bg-content1 px-3">
      <Terminal className="h-4 w-4 text-primary" />
      <span className="text-sm font-semibold text-foreground">opencode WebIDE</span>
      <Chip size="sm" variant="flat" color="default" className="text-[10px] uppercase">
        M2
      </Chip>
    </header>
  );
}
