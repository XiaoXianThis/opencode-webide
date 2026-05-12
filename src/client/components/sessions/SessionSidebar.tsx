import { useEffect, useState } from "react";
import type { Key } from "react";
import { Plus, Trash2, RefreshCw } from "lucide-react";
import {
  Button,
  EmptyState,
  Label,
  ListBox,
  ScrollShadow,
  Spinner,
  Tooltip,
} from "@heroui/react";
import { useSessionsStore } from "@/store/sessions";
import { formatNewSessionTitle, formatRelativeTime, formatSessionTitle } from "@/lib/utils";

export function SessionSidebar() {
  const { sessions, activeId, status, error, refresh, create, remove, setActive } =
    useSessionsStore();
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const handleCreate = async () => {
    setBusy(true);
    try {
      await create(formatNewSessionTitle());
    } finally {
      setBusy(false);
    }
  };

  const onSelection = (keys: "all" | Set<Key>) => {
    if (keys === "all") return;
    const [first] = keys;
    if (typeof first === "string") setActive(first);
  };

  return (
    <aside className="flex h-full w-64 shrink-0 flex-col border-r border-default-200 bg-content1">
      <header className="flex items-center justify-between gap-2 px-3 py-2">
        <span className="text-sm font-semibold tracking-wide text-foreground">会话</span>
        <div className="flex items-center gap-1">
          <Tooltip>
            <Tooltip.Trigger>
              <Button
                size="sm"
                variant="light"
                isIconOnly
                aria-label="刷新"
                onPress={() => void refresh()}
              >
                {status === "loading" ? (
                  <Spinner size="sm" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
              </Button>
            </Tooltip.Trigger>
            <Tooltip.Content>刷新</Tooltip.Content>
          </Tooltip>
          <Tooltip>
            <Tooltip.Trigger>
              <Button
                size="sm"
                variant="light"
                isIconOnly
                aria-label="新建会话"
                isDisabled={busy}
                onPress={handleCreate}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </Tooltip.Trigger>
            <Tooltip.Content>新建会话</Tooltip.Content>
          </Tooltip>
        </div>
      </header>

      {error && (
        <div
          role="alert"
          className="mx-3 mb-2 rounded-medium border border-danger bg-danger/10 px-2 py-1 text-tiny text-danger"
        >
          {error}
        </div>
      )}

      {sessions.length === 0 && status === "ready" ? (
        <EmptyState className="m-3 gap-2 text-center">
          <div className="text-sm font-medium text-foreground">暂无会话</div>
          <div className="text-xs text-default-500">点击右上角 + 新建</div>
        </EmptyState>
      ) : (
        <ScrollShadow className="flex-1">
          <ListBox
            aria-label="会话列表"
            selectionMode="single"
            selectedKeys={activeId ? new Set([activeId]) : new Set()}
            onSelectionChange={onSelection}
            className="px-2 pb-2"
          >
            {sessions.map((s) => (
              <ListBox.Item key={s.id} id={s.id} textValue={s.title || s.id}>
                <Label className="min-w-0 flex-1 truncate">
                  {formatSessionTitle(s.title)}
                </Label>
                <span className="shrink-0 text-[10px] text-default-500">
                  {formatRelativeTime(s.time?.updated)}
                </span>
                <Button
                  size="sm"
                  variant="light"
                  isIconOnly
                  aria-label={`删除会话 ${s.title || s.id}`}
                  onPress={() => {
                    if (confirm(`删除会话 "${s.title || s.id}"？`)) void remove(s.id);
                  }}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </ListBox.Item>
            ))}
          </ListBox>
        </ScrollShadow>
      )}
    </aside>
  );
}
