import { useCallback, useEffect, useState } from "react";
import type { Event } from "@opencode-ai/sdk/client";
import { useOpencodeEvents } from "@/lib/events";
import { useMessagesStore } from "@/store/messages";
import { useSessionsStore } from "@/store/sessions";
import { useTodosStore } from "@/store/todos";
import { usePermissionsStore } from "@/store/permissions";
import { useWorkspaceStore } from "@/store/workspace";
import { useVcsStore } from "@/store/vcs";
import { TopBar } from "@/components/layout/TopBar";
import { StatusBar } from "@/components/layout/StatusBar";
import { SessionSidebar } from "@/components/sessions/SessionSidebar";
import { WorkspaceCenter } from "@/components/workspace/WorkspaceCenter";
import { ChatPanel } from "@/components/chat/ChatPanel";
import { PermissionCenter } from "@/components/permissions/PermissionCenter";
import { Login } from "@/components/auth/Login";

function canUseEvents(pathname: string): boolean {
  return pathname !== "/login";
}

export function App() {
  const [pathname, setPathname] = useState(() => window.location.pathname);
  const onEvent = useCallback((event: Event) => {
    useMessagesStore.getState().applyEvent(event);
    useTodosStore.getState().applyEvent(event);
    usePermissionsStore.getState().applyEvent(event);
    useSessionsStore.getState().applyEvent(event);
    useWorkspaceStore.getState().applyEvent(event);
    useVcsStore.getState().applyEvent(event);
  }, []);

  const onReconnected = useCallback(() => {
    const { sessions, loadMessages } = useMessagesStore.getState();
    for (const sid of Object.keys(sessions)) void loadMessages(sid);
    void useSessionsStore.getState().refresh();
    void useVcsStore.getState().load();
  }, []);

  useOpencodeEvents(canUseEvents(pathname) ? { onEvent, onReconnected } : {});

  useEffect(() => {
    const update = () => setPathname(window.location.pathname);
    window.addEventListener("popstate", update);
    window.addEventListener("webide:navigate", update);
    return () => {
      window.removeEventListener("popstate", update);
      window.removeEventListener("webide:navigate", update);
    };
  }, []);

  if (pathname === "/login") return <Login />;

  return (
    <div className="flex h-full w-full flex-col">
      <TopBar />
      <div className="flex min-h-0 flex-1">
        <SessionSidebar />
        <WorkspaceCenter />
        <ChatPanel />
      </div>
      <StatusBar />
      <PermissionCenter />
    </div>
  );
}
