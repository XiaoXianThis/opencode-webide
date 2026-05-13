import { useEffect } from "react";
import { Plus, TerminalSquare, Trash2 } from "lucide-react";
import { Button, Chip, EmptyState, ScrollShadow, Spinner } from "@heroui/react";
import { usePtyStore } from "@/store/pty";
import { cn } from "@/lib/utils";

export function PtyPanel() {
  const sessions = usePtyStore((s) => s.sessions);
  const activeId = usePtyStore((s) => s.activeId);
  const status = usePtyStore((s) => s.status);
  const error = usePtyStore((s) => s.error);
  const exitCodes = usePtyStore((s) => s.exitCodes);
  const load = usePtyStore((s) => s.load);
  const create = usePtyStore((s) => s.create);
  const remove = usePtyStore((s) => s.remove);
  const select = usePtyStore((s) => s.select);
  const active = sessions.find((session) => session.id === activeId) ?? null;

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <section className="flex h-48 shrink-0 flex-col border-t border-default-200 bg-content1">
      <header className="flex h-9 items-center gap-2 border-b border-default-200 px-3">
        <TerminalSquare className="h-4 w-4 text-primary" />
        <span className="text-xs font-semibold text-foreground">终端</span>
        {status === "loading" && <Spinner size="sm" />}
        <Button size="sm" variant="light" className="ml-auto h-7" onPress={() => void create()}>
          <Plus className="h-3.5 w-3.5" />
          新建
        </Button>
      </header>
      {error && <div role="alert" className="m-2 rounded-medium border border-danger bg-danger/10 px-2 py-1 text-tiny text-danger">{error}</div>}
      <div className="flex min-h-0 flex-1">
        <ScrollShadow className="w-40 shrink-0 overflow-y-auto border-r border-default-200 p-2 xl:w-56">
          {sessions.length === 0 ? (
            <EmptyState className="h-full justify-center text-center text-xs text-default-500">暂无 PTY 会话</EmptyState>
          ) : (
            <div className="space-y-1" role="list" aria-label="PTY 会话">
              {sessions.map((session) => (
                <button
                  key={session.id}
                  type="button"
                  className={cn(
                    "flex w-full items-center justify-between rounded-medium px-2 py-1.5 text-left text-xs",
                    session.id === activeId ? "bg-primary/10 text-primary" : "text-default-600 hover:bg-default-100",
                  )}
                  onClick={() => select(session.id)}
                >
                  <span className="truncate">{session.title || session.command}</span>
                  <span className={cn("ml-2 h-1.5 w-1.5 shrink-0 rounded-full", session.status === "running" ? "bg-success" : "bg-default-400")} />
                </button>
              ))}
            </div>
          )}
        </ScrollShadow>
        <div className="min-w-0 flex-1 p-3 font-mono text-xs text-default-600">
          {active ? (
            <div className="flex h-full flex-col gap-2 rounded-medium border border-default-200 bg-background p-3">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-foreground">{active.title}</span>
                <Chip size="sm" variant="flat" color={active.status === "running" ? "success" : "default"}>
                  {active.status === "running" ? "running" : `exited ${exitCodes[active.id] ?? ""}`.trim()}
                </Chip>
                <Button size="sm" variant="light" isIconOnly aria-label="关闭终端" className="ml-auto h-7 w-7 min-w-7" onPress={() => void remove(active.id)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
              <div className="text-default-500">{[active.command, ...active.args].join(" ")}</div>
              <div className="text-default-500">cwd: {active.cwd}</div>
              <div className="mt-auto text-[10px] text-default-400">PTY IO stream is managed by opencode; WebIDE currently tracks lifecycle events.</div>
            </div>
          ) : (
            <EmptyState className="h-full justify-center text-center text-xs text-default-500">选择或新建终端</EmptyState>
          )}
        </div>
      </div>
    </section>
  );
}
