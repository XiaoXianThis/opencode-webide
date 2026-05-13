import { useEffect, useState } from "react";
import { MessageCircle, Search, Square, ShieldAlert, Sparkles } from "lucide-react";
import { Button, EmptyState, Input } from "@heroui/react";
import { useSessionsStore } from "@/store/sessions";
import { useMessagesStore } from "@/store/messages";
import { usePermissionsStore } from "@/store/permissions";
import { useModelsStore } from "@/store/models";
import { MessageList } from "./MessageList";
import { Composer } from "./Composer";
import { SessionSidebar } from "@/components/sessions/SessionSidebar";

export function ChatPanel() {
  const [messageSearch, setMessageSearch] = useState("");
  const [tab, setTab] = useState<"messages" | "sessions">("messages");
  const active = useSessionsStore((s) =>
    s.sessions.find((x) => x.id === s.activeId) ?? null,
  );
  const loadMessages = useMessagesStore((s) => s.loadMessages);
  const streaming = useMessagesStore((s) =>
    active ? (s.streaming[active.id] ?? false) : false,
  );
  const abort = useMessagesStore((s) => s.abort);
  const summarize = useSessionsStore((s) => s.summarize);
  const selectedProviderID = useModelsStore((s) => s.selectedProviderID);
  const selectedModelID = useModelsStore((s) => s.selectedModelID);
  const pendingPermissions = usePermissionsStore((s) =>
    active ? (s.bySession[active.id]?.length ?? 0) : 0,
  );

  useEffect(() => {
    if (!active) return;
    void loadMessages(active.id);
  }, [active?.id, loadMessages]);

  return (
    <section className="flex h-full w-[360px] shrink-0 flex-col border-l border-default-200 bg-background xl:w-[420px] 2xl:w-[440px]">
      <header className="flex h-10 shrink-0 items-center gap-2 border-b border-default-200 bg-content1 px-3">
        <MessageCircle className="h-4 w-4 text-primary" />
        <span className="truncate text-sm font-medium text-foreground">
          {active?.title || (active ? "未命名会话" : "未选择会话")}
        </span>
        {pendingPermissions > 0 && (
          <span
            className="ml-1 inline-flex items-center gap-1 rounded-full bg-danger/15 px-1.5 py-0.5 text-[10px] font-medium text-danger"
            title={`${pendingPermissions} 个待审批权限`}
            data-testid="chat-permission-indicator"
          >
            <ShieldAlert className="h-3 w-3" />
            {pendingPermissions}
          </span>
        )}
        {active && selectedProviderID && selectedModelID && (
          <Button
            size="sm"
            variant="light"
            className="ml-auto"
            onPress={() =>
              void summarize(active.id, { providerID: selectedProviderID, modelID: selectedModelID })
            }
          >
            <Sparkles className="h-3 w-3" />
            总结
          </Button>
        )}
        {streaming && active && (
          <Button
            size="sm"
            variant="flat"
            color="danger"
            className={selectedProviderID && selectedModelID ? "" : "ml-auto"}
            onPress={() => void abort(active.id)}
          >
            <Square className="h-3 w-3" />
            中止
          </Button>
        )}
      </header>

      <div className="grid grid-cols-2 border-b border-default-200 bg-content1 text-xs">
        <button
          type="button"
          className={tab === "messages" ? "border-b-2 border-primary px-3 py-2 font-medium text-primary" : "px-3 py-2 text-default-500 hover:text-foreground"}
          onClick={() => setTab("messages")}
        >
          消息
        </button>
        <button
          type="button"
          className={tab === "sessions" ? "border-b-2 border-primary px-3 py-2 font-medium text-primary" : "px-3 py-2 text-default-500 hover:text-foreground"}
          onClick={() => setTab("sessions")}
        >
          会话
        </button>
      </div>

      {tab === "sessions" ? <SessionSidebar embedded /> : (
        <>

      {active && (
        <div className="border-b border-default-200 bg-content1/70 px-3 py-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-default-500" />
            <Input
              aria-label="搜索当前会话消息"
              size="sm"
              value={messageSearch}
              onChange={(event) => setMessageSearch(event.target.value)}
              className="pl-7"
              placeholder="搜索当前会话消息"
            />
          </div>
        </div>
      )}

      {active ? (
        <>
          <MessageList sessionID={active.id} searchQuery={messageSearch} />
          <Composer sessionID={active.id} />
        </>
      ) : (
        <EmptyState className="flex-1 justify-center gap-2 text-center">
          <div className="text-sm font-medium text-foreground">未选择会话</div>
          <div className="text-xs text-default-500">从左侧选择或新建会话</div>
        </EmptyState>
      )}
        </>
      )}
    </section>
  );
}
