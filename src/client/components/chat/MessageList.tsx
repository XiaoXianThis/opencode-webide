import { useEffect, useRef } from "react";
import { Spinner } from "@heroui/react";
import { useMessagesStore } from "@/store/messages";
import { useSessionsStore } from "@/store/sessions";
import { MessageItem } from "./MessageItem";

function partText(part: unknown): string {
  if (typeof part === "object" && part && "text" in part && typeof part.text === "string") {
    return part.text;
  }
  return "";
}

export function MessageList({ sessionID, searchQuery = "" }: { sessionID: string; searchQuery?: string }) {
  const data = useMessagesStore((s) => s.sessions[sessionID]);
  const loading = useMessagesStore((s) => s.loading[sessionID]);
  const error = useMessagesStore((s) => s.loadError[sessionID]);
  const active = useSessionsStore((s) => s.sessions.find((session) => session.id === sessionID) ?? null);
  const fork = useSessionsStore((s) => s.fork);
  const revert = useSessionsStore((s) => s.revert);
  const unrevert = useSessionsStore((s) => s.unrevert);
  const sendPrompt = useMessagesStore((s) => s.sendPrompt);
  const containerRef = useRef<HTMLDivElement>(null);
  const stickRef = useRef(true);

  // Track whether the user is at the bottom; only auto-scroll if so.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onScroll = () => {
      const distance = el.scrollHeight - el.scrollTop - el.clientHeight;
      stickRef.current = distance < 80;
    };
    el.addEventListener("scroll", onScroll);
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  // Auto-scroll on new content if pinned at bottom.
  useEffect(() => {
    const el = containerRef.current;
    if (!el || !stickRef.current) return;
    el.scrollTop = el.scrollHeight;
  }, [data]);

  if (loading && !data) {
    return (
      <div className="flex flex-1 items-center justify-center gap-2 text-xs text-default-500">
        <Spinner size="sm" />
        加载中…
      </div>
    );
  }

  if (error) {
    return (
      <div
        role="alert"
        className="m-3 rounded-medium border border-danger bg-danger/10 p-2 text-xs text-danger"
      >
        {error}
      </div>
    );
  }

  if (!data || data.messageOrder.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center text-xs text-default-500">
        发送消息开始对话
      </div>
    );
  }

  const normalizedSearch = searchQuery.trim().toLowerCase();
  const renderedMessages = data.messageOrder.filter((mid) => {
    if (!normalizedSearch) return true;
    const info = data.messages[mid];
    const bucket = data.parts[mid];
    const text = bucket ? bucket.partOrder.map((pid) => partText(bucket.byId[pid])).join("\n") : "";
    return `${info?.role ?? ""}\n${text}`.toLowerCase().includes(normalizedSearch);
  });

  if (normalizedSearch && renderedMessages.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center text-xs text-default-500">
        没有匹配的消息
      </div>
    );
  }

  return (
    <div ref={containerRef} className="flex-1 overflow-y-auto">
      {renderedMessages.map((mid) => {
        const info = data.messages[mid];
        if (!info) return null;
        const bucket = data.parts[mid];
        const parts = bucket
          ? bucket.partOrder.map((pid) => bucket.byId[pid]).filter((p): p is NonNullable<typeof p> => Boolean(p))
          : [];
        const revertCreated = active?.revert ? data.messages[active.revert.messageID]?.time?.created : undefined;
        const isAfterRevert = revertCreated !== undefined && (info.time?.created ?? 0) > revertCreated;
        return (
          <MessageItem
            key={mid}
            info={info}
            parts={parts}
            revert={active?.revert}
            isAfterRevert={isAfterRevert}
            searchQuery={searchQuery}
            onFork={(messageID) => void fork(sessionID, { messageID })}
            onRevert={(messageID) => void revert(sessionID, { messageID })}
            onUnrevert={() => void unrevert(sessionID)}
            onEditResend={(messageID) => {
              const source = data.parts[messageID];
              const text = source ? source.partOrder.map((pid) => partText(source.byId[pid])).join("\n").trim() : "";
              if (text) void sendPrompt(sessionID, text, { messageID });
            }}
          />
        );
      })}
    </div>
  );
}
