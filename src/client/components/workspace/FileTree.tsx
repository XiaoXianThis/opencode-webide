import { useEffect } from "react";
import { ChevronRight, FileText, Folder, FolderOpen } from "lucide-react";
import { Button, EmptyState, ScrollShadow, Spinner } from "@heroui/react";
import type { FileNode } from "@opencode-ai/sdk/client";
import { cn } from "@/lib/utils";
import { useFilesStore } from "@/store/files";
import { useWorkspaceStore } from "@/store/workspace";
import { FileStatusBadge } from "./FileStatusBadge";

const ROOT_PATH = ".";
const VIRTUAL_LIMIT = 200;
const EMPTY_NODES: FileNode[] = [];

export function FileTree() {
  const nodes = useFilesStore((s) => s.nodesByPath[ROOT_PATH] ?? EMPTY_NODES);
  const hasRoot = useFilesStore((s) => s.nodesByPath[ROOT_PATH] !== undefined);
  const status = useFilesStore((s) => s.status);
  const error = useFilesStore((s) => s.error);
  const refresh = useFilesStore((s) => s.refresh);
  const refreshStatus = useFilesStore((s) => s.refreshStatus);

  useEffect(() => {
    if (!hasRoot) void refresh(ROOT_PATH);
    void refreshStatus();
  }, [hasRoot, refresh, refreshStatus]);

  return (
    <aside className="flex h-full w-72 shrink-0 flex-col border-r border-default-200 bg-content1">
      <header className="flex h-10 items-center justify-between border-b border-default-200 px-3">
        <span className="text-sm font-semibold text-foreground">文件</span>
        {status === "loading" && <Spinner size="sm" />}
      </header>
      {error && <div role="alert" className="m-2 rounded-medium border border-danger bg-danger/10 px-2 py-1 text-tiny text-danger">{error}</div>}
      {nodes.length === 0 && status === "ready" ? (
        <EmptyState className="m-3 gap-2 text-center"><div className="text-sm font-medium text-foreground">暂无文件</div></EmptyState>
      ) : (
        <ScrollShadow className="min-h-0 flex-1 p-2">
          <div role="tree" aria-label="文件树" className="space-y-0.5">
            {nodes.slice(0, VIRTUAL_LIMIT).map((node) => <FileTreeItem key={node.path} node={node} depth={0} />)}
            {nodes.length > VIRTUAL_LIMIT && <div data-testid="file-tree-virtualized" className="px-2 py-1 text-tiny text-default-500">仅渲染前 {VIRTUAL_LIMIT} 项</div>}
          </div>
        </ScrollShadow>
      )}
    </aside>
  );
}

export function FileTreeItem({ node, depth }: { node: FileNode; depth: number }) {
  const expanded = useFilesStore((s) => s.expanded.has(node.path));
  const children = useFilesStore((s) => s.nodesByPath[node.path] ?? EMPTY_NODES);
  const loading = useFilesStore((s) => s.loading[node.path] ?? false);
  const toggle = useFilesStore((s) => s.toggle);
  const status = useFilesStore((s) => s.statusByPath[node.path]);
  const openFile = useWorkspaceStore((s) => s.openFile);
  const isDirectory = node.type === "directory";
  return (
    <div role="treeitem" aria-expanded={isDirectory ? expanded : undefined}>
      <Button
        variant="light"
        size="sm"
        className="h-7 w-full justify-start gap-1 px-2 text-default-600"
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
        onPress={() => isDirectory ? void toggle(node.path) : void openFile(node.path)}
      >
        {isDirectory ? <ChevronRight className={cn("h-3.5 w-3.5 transition-transform", expanded && "rotate-90")} /> : <span className="w-3.5" />}
        {loading ? <Spinner size="sm" /> : isDirectory ? expanded ? <FolderOpen className="h-4 w-4 text-primary" /> : <Folder className="h-4 w-4 text-primary" /> : <FileText className="h-4 w-4 text-default-500" />}
        <span className="min-w-0 flex-1 truncate text-left text-xs">{node.name}</span>
        <FileStatusBadge status={status} />
      </Button>
      {isDirectory && expanded && children.map((child) => <FileTreeItem key={child.path} node={child} depth={depth + 1} />)}
    </div>
  );
}
