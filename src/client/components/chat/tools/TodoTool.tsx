import { useMemo } from "react";
import { ListTodo, CircleCheck, Circle, Loader2, CircleX } from "lucide-react";
import type { Part, Todo } from "@opencode-ai/sdk/client";
import { ToolCard, ErrorBlock, getDuration } from "./ToolCard";
import { useTodosStore } from "@/store/todos";
import { cn } from "@/lib/utils";

type ToolPart = Extract<Part, { type: "tool" }>;

interface TodoInput {
  todos?: Todo[];
}

const STATUS_ORDER = ["in_progress", "pending", "completed", "cancelled"] as const;

const STATUS_META: Record<
  string,
  { icon: typeof Circle; color: string; label: string }
> = {
  pending: { icon: Circle, color: "text-default-400", label: "待办" },
  in_progress: { icon: Loader2, color: "text-warning animate-spin", label: "进行中" },
  completed: { icon: CircleCheck, color: "text-success", label: "已完成" },
  cancelled: { icon: CircleX, color: "text-default-500 line-through", label: "已取消" },
};

export function TodoTool({ part }: { part: ToolPart }) {
  const liveTodos = useTodosStore((s) => s.bySession[part.sessionID]);
  const input = part.state.input as TodoInput;
  // Prefer the live store (driven by `todo.updated` events) so the list stays
  // in sync after the tool call resolves; fall back to the input snapshot.
  const todos: Todo[] = liveTodos ?? input.todos ?? [];

  const grouped = useMemo(() => {
    const map = new Map<string, Todo[]>();
    for (const t of todos) {
      const arr = map.get(t.status) ?? [];
      arr.push(t);
      map.set(t.status, arr);
    }
    return STATUS_ORDER.flatMap((s) => {
      const arr = map.get(s);
      return arr ? [[s, arr] as const] : [];
    });
  }, [todos]);

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const t of todos) c[t.status] = (c[t.status] ?? 0) + 1;
    return c;
  }, [todos]);

  return (
    <ToolCard
      tool={part.tool}
      icon={<ListTodo className="h-3.5 w-3.5 text-default-500" />}
      status={part.state.status}
      title={`${todos.length} todos`}
      durationMs={getDuration(part.state)}
      trailing={
        <span className="flex items-center gap-1 text-[10px] tabular-nums text-default-400">
          {(counts.completed ?? 0) > 0 && (
            <span className="text-success" data-testid="todo-completed-count">
              ✓ {counts.completed}
            </span>
          )}
          {(counts.in_progress ?? 0) > 0 && (
            <span className="text-warning" data-testid="todo-in-progress-count">
              ⏵ {counts.in_progress}
            </span>
          )}
          {(counts.pending ?? 0) > 0 && (
            <span data-testid="todo-pending-count">○ {counts.pending}</span>
          )}
        </span>
      }
    >
      {grouped.length === 0 ? (
        <div className="rounded-medium bg-background p-2 text-[11px] text-default-500">
          暂无任务
        </div>
      ) : (
        <div className="space-y-2" data-testid="todo-list">
          {grouped.map(([status, items]) => {
            const meta = STATUS_META[status] ?? STATUS_META.pending!;
            const Icon = meta.icon;
            return (
              <div key={status}>
                <div className="mb-1 flex items-center gap-1.5 text-[10px] uppercase tracking-wide text-default-500">
                  <Icon className={cn("h-3 w-3", meta.color)} />
                  {meta.label} ({items.length})
                </div>
                <ul className="space-y-0.5">
                  {items.map((t) => (
                    <li
                      key={t.id}
                      data-status={t.status}
                      data-testid="todo-item"
                      className={cn(
                        "flex items-start gap-2 text-[11px]",
                        t.status === "completed" &&
                          "text-default-500 line-through decoration-default-400",
                        t.status === "cancelled" && "text-default-400 line-through",
                      )}
                    >
                      <Icon className={cn("mt-0.5 h-3 w-3 shrink-0", meta.color)} />
                      <span className="break-words">{t.content}</span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      )}
      {part.state.status === "error" && <ErrorBlock message={part.state.error} />}
    </ToolCard>
  );
}
