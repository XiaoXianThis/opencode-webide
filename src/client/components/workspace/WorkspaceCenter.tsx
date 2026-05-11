import { FileCode2 } from "lucide-react";
import { EmptyState } from "@heroui/react";

export function WorkspaceCenter() {
  return (
    <main className="flex h-full flex-1 flex-col items-center justify-center">
      <EmptyState className="gap-2 text-center">
        <FileCode2 className="h-10 w-10 opacity-40" />
        <div className="text-sm font-medium text-foreground">工作区占位</div>
        <div className="text-xs text-default-500">编辑器与文件树将在 M6 接入</div>
      </EmptyState>
    </main>
  );
}
