import { useEffect, useRef } from "react";
import { Spinner } from "@heroui/react";
import { useMessagesStore } from "@/store/messages";
import { MessageItem } from "./MessageItem";

export function MessageList({ sessionID }: { sessionID: string }) {
  const data = useMessagesStore((s) => s.sessions[sessionID]);
  const loading = useMessagesStore((s) => s.loading[sessionID]);
  const error = useMessagesStore((s) => s.loadError[sessionID]);
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

  return (
    <div ref={containerRef} className="flex-1 overflow-y-auto">
      {data.messageOrder.map((mid) => {
        const info = data.messages[mid];
        if (!info) return null;
        const bucket = data.parts[mid];
        const parts = bucket
          ? bucket.partOrder.map((pid) => bucket.byId[pid]).filter((p): p is NonNullable<typeof p> => Boolean(p))
          : [];
        return <MessageItem key={mid} info={info} parts={parts} />;
      })}
    </div>
  );
}
