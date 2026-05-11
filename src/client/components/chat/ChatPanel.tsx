import { useEffect } from "react";
import { MessageCircle, Square } from "lucide-react";
import { Button, EmptyState } from "@heroui/react";
import { useSessionsStore } from "@/store/sessions";
import { useMessagesStore } from "@/store/messages";
import { MessageList } from "./MessageList";
import { Composer } from "./Composer";

export function ChatPanel() {
  const active = useSessionsStore((s) =>
    s.sessions.find((x) => x.id === s.activeId) ?? null,
  );
  const loadMessages = useMessagesStore((s) => s.loadMessages);
  const streaming = useMessagesStore((s) =>
    active ? (s.streaming[active.id] ?? false) : false,
  );
  const abort = useMessagesStore((s) => s.abort);

  useEffect(() => {
    if (!active) return;
    void loadMessages(active.id);
  }, [active?.id, loadMessages]);

  return (
    <section className="flex h-full w-[440px] shrink-0 flex-col border-l border-default-200 bg-background">
      <header className="flex h-10 shrink-0 items-center gap-2 border-b border-default-200 bg-content1 px-3">
        <MessageCircle className="h-4 w-4 text-primary" />
        <span className="truncate text-sm font-medium text-foreground">
          {active?.title || (active ? "未命名会话" : "未选择会话")}
        </span>
        {streaming && active && (
          <Button
            size="sm"
            variant="flat"
            color="danger"
            className="ml-auto"
            startContent={<Square className="h-3 w-3" />}
            onPress={() => void abort(active.id)}
          >
            中止
          </Button>
        )}
      </header>

      {active ? (
        <>
          <MessageList sessionID={active.id} />
          <Composer sessionID={active.id} />
        </>
      ) : (
        <EmptyState className="flex-1 justify-center gap-2 text-center">
          <div className="text-sm font-medium text-foreground">未选择会话</div>
          <div className="text-xs text-default-500">从左侧选择或新建会话</div>
        </EmptyState>
      )}
    </section>
  );
}
