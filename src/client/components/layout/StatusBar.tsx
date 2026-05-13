import { useEffect } from "react";
import { Code } from "@heroui/react";
import { useConnectionStore, type ConnectionStatus } from "@/store/connection";
import { useVcsStore } from "@/store/vcs";
import { useLspStore } from "@/store/lsp";
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

function lspLabel(count: number, hasError: boolean, loadError: string | null): string {
  if (loadError || hasError) return "LSP 异常";
  if (count === 0) return "LSP 未连接";
  return `LSP ${count} 已连接`;
}

export function StatusBar() {
  const status = useConnectionStore((s) => s.status);
  const branch = useVcsStore((s) => s.branch);
  const loadBranch = useVcsStore((s) => s.load);
  const lspClients = useLspStore((s) => s.clients);
  const lspError = useLspStore((s) => s.error);
  const loadLsp = useLspStore((s) => s.load);
  const hasLspClientError = lspClients.some((client) => client.status === "error");

  useEffect(() => {
    void loadBranch();
  }, [loadBranch]);

  useEffect(() => {
    void loadLsp();
  }, [loadLsp]);

  return (
    <div className="flex h-7 shrink-0 items-center justify-between border-t border-default-200 bg-content1 px-3 text-[11px] text-default-500">
      <div className="flex items-center gap-2">
        <span aria-hidden className={cn("inline-block h-2 w-2 rounded-full", DOTS[status])} />
        <span>opencode {LABELS[status]}</span>
        {branch && <span data-testid="status-branch">git:{branch}</span>}
        <span
          data-testid="status-lsp"
          title={lspError ?? lspClients.map((client) => client.name).join(", ")}
          className={cn(
            "inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5",
            lspError || hasLspClientError
              ? "border-danger/30 bg-danger/10 text-danger"
              : lspClients.length > 0
                ? "border-success/30 bg-success/10 text-success"
                : "border-default-200 bg-content2 text-default-500",
          )}
        >
          <span
            aria-hidden
            className={cn(
              "inline-block h-1.5 w-1.5 rounded-full",
              lspError || hasLspClientError
                ? "bg-danger"
                : lspClients.length > 0
                  ? "bg-success"
                  : "bg-default-300",
            )}
          />
          {lspLabel(lspClients.length, hasLspClientError, lspError)}
        </span>
      </div>
      <Code size="sm" className="bg-transparent text-default-500 opacity-70">
        /api → 127.0.0.1:4096
      </Code>
    </div>
  );
}
