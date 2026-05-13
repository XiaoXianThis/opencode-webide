import { useEffect } from "react";
import { Code } from "@heroui/react";
import { useConnectionStore, type ConnectionStatus } from "@/store/connection";
import { useVcsStore } from "@/store/vcs";
import { cn } from "@/lib/utils";

const LABELS: Record<ConnectionStatus, string> = {
  connecting: "连接中…",
  connected: "已连接",
  disconnected: "已断开，重连中…",
};

const DOTS: Record<ConnectionStatus, string> = {
  connecting: "bg-warning",
  connected: "bg-success",
  disconnected: "bg-danger",
};

export function StatusBar() {
  const status = useConnectionStore((s) => s.status);
  const branch = useVcsStore((s) => s.branch);
  const loadBranch = useVcsStore((s) => s.load);

  useEffect(() => {
    void loadBranch();
  }, [loadBranch]);

  return (
    <div className="flex h-7 shrink-0 items-center justify-between border-t border-default-200 bg-content1 px-3 text-[11px] text-default-500">
      <div className="flex items-center gap-2">
        <span aria-hidden className={cn("inline-block h-2 w-2 rounded-full", DOTS[status])} />
        <span>opencode {LABELS[status]}</span>
        {branch && <span data-testid="status-branch">git:{branch}</span>}
      </div>
      <Code size="sm" className="bg-transparent text-default-500 opacity-70">
        /api → 127.0.0.1:4096
      </Code>
    </div>
  );
}
