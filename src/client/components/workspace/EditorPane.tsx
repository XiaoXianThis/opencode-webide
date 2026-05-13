import { EmptyState } from "@heroui/react";
import { FileCode2 } from "lucide-react";
import { useWorkspaceStore } from "@/store/workspace";

export function EditorPane() {
  const active = useWorkspaceStore((s) => s.tabs.find((tab) => tab.id === s.activeTabId) ?? null);
  const content = useWorkspaceStore((s) => active ? s.buffers[active.path] : undefined);
  const status = useWorkspaceStore((s) => s.status);
  if (!active) return <EmptyState className="flex-1 justify-center gap-2 text-center"><FileCode2 className="h-10 w-10 opacity-40" /><div className="text-sm font-medium text-foreground">选择文件开始浏览</div><div className="text-xs text-default-500">M6 readonly editor</div></EmptyState>;
  return <pre data-testid="editor-pane" className="min-h-0 flex-1 overflow-auto bg-background p-4 font-mono text-xs leading-relaxed text-default-700"><code>{status === "loading" && content === undefined ? "Loading…" : content}</code></pre>;
}
