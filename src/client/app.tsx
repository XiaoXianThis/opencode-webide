import { useCallback } from "react";
import type { Event } from "@opencode-ai/sdk/client";
import { useOpencodeEvents } from "@/lib/events";
import { useMessagesStore } from "@/store/messages";
import { useSessionsStore } from "@/store/sessions";
import { TopBar } from "@/components/layout/TopBar";
import { StatusBar } from "@/components/layout/StatusBar";
import { SessionSidebar } from "@/components/sessions/SessionSidebar";
import { WorkspaceCenter } from "@/components/workspace/WorkspaceCenter";
import { ChatPanel } from "@/components/chat/ChatPanel";

export function App() {
  const onEvent = useCallback((event: Event) => {
    // Forward message-related events to the messages store.
    useMessagesStore.getState().applyEvent(event);

    // Mirror session lifecycle into the sessions list.
    if (
      event.type === "session.created" ||
      event.type === "session.updated" ||
      event.type === "session.deleted"
    ) {
      void useSessionsStore.getState().refresh();
    }
  }, []);

  // After (re)connecting, refill any session that already has data so we don't
  // miss events that happened during the disconnection window.
  const onReconnected = useCallback(() => {
    const { sessions, loadMessages } = useMessagesStore.getState();
    for (const sid of Object.keys(sessions)) {
      void loadMessages(sid);
    }
    void useSessionsStore.getState().refresh();
  }, []);

  useOpencodeEvents({ onEvent, onReconnected });

  return (
    <div className="flex h-full w-full flex-col">
      <TopBar />
      <div className="flex min-h-0 flex-1">
        <SessionSidebar />
        <WorkspaceCenter />
        <ChatPanel />
      </div>
      <StatusBar />
    </div>
  );
}
