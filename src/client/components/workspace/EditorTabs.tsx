import { X } from "lucide-react";
import { Button } from "@heroui/react";
import { cn } from "@/lib/utils";
import { useWorkspaceStore } from "@/store/workspace";

export function EditorTabs() {
  const { tabs, activeTabId, dirty, switchTab, closeTab } = useWorkspaceStore();
  if (tabs.length === 0) return null;
  return <div role="tablist" aria-label="打开的文件" className="flex h-10 shrink-0 overflow-x-auto border-b border-default-200 bg-content1">{tabs.map((tab) => <div key={tab.id} role="tab" aria-selected={tab.id === activeTabId} className={cn("group flex items-center gap-1 border-r border-default-200 px-2 text-xs", tab.id === activeTabId ? "bg-background text-foreground" : "text-default-500")}><button className="flex items-center gap-1" onClick={() => switchTab(tab.id)}>{dirty.has(tab.path) && <span aria-label="dirty" className="h-1.5 w-1.5 rounded-full bg-warning" />}{tab.name}</button><Button size="sm" variant="light" isIconOnly aria-label={`关闭 ${tab.name}`} onPress={() => { if (!dirty.has(tab.path) || confirm(`关闭未保存文件 ${tab.name}？`)) closeTab(tab.id); }}><X className="h-3 w-3" /></Button></div>)}</div>;
}
