import { useCallback, useEffect } from "react";
import type { Event } from "@opencode-ai/sdk/client";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { useOpencodeEvents } from "@/lib/events";
import { useMessagesStore } from "@/store/messages";
import { useThemeStore } from "@/store/theme";
import { useToastsStore } from "@/store/toasts";
import { useSessionsStore } from "@/store/sessions";
import { useTodosStore } from "@/store/todos";
import { usePermissionsStore } from "@/store/permissions";
import { useWorkspaceStore } from "@/store/workspace";
import { useVcsStore } from "@/store/vcs";
import { useLspStore } from "@/store/lsp";
import { usePtyStore } from "@/store/pty";
import { TopBar } from "@/components/layout/TopBar";
import { StatusBar } from "@/components/layout/StatusBar";
import { WorkspaceCenter } from "@/components/workspace/WorkspaceCenter";
import { ChatPanel } from "@/components/chat/ChatPanel";
import { PermissionCenter } from "@/components/permissions/PermissionCenter";
import { ToastCenter } from "@/components/layout/ToastCenter";
import { Login } from "@/components/auth/Login";
import { useIsMobile } from "@/hooks/useIsMobile";
import { MobileAppShell } from "@/components/mobile/MobileAppShell";
import { MobileChatPage, MobileFilesPage, MobileMePage, MobileProjectsPage, MobileTerminalPage, NotFound as MobileNotFound } from "@/components/mobile/MobilePages";

function canUseEvents(pathname: string): boolean {
  return pathname !== "/login";
}

function DesktopShell() {
  return (
    <div className="flex h-full w-full min-w-0 flex-col overflow-hidden">
      <TopBar />
      <div className="flex min-h-0 min-w-0 flex-1 overflow-hidden">
        <WorkspaceCenter />
        <ChatPanel />
      </div>
      <StatusBar />
    </div>
  );
}

function RootRoute() {
  return useIsMobile() ? <Navigate to="/m/chat" replace /> : <DesktopShell />;
}

function MobileRouteGuard() {
  const isMobile = useIsMobile();
  return isMobile ? <MobileAppShell /> : <Navigate to="/" replace />;
}

function NotFound() {
  return <Navigate to="/" replace />;
}

export function App() {
  const location = useLocation();
  const onEvent = useCallback((event: Event) => {
    useMessagesStore.getState().applyEvent(event);
    useTodosStore.getState().applyEvent(event);
    usePermissionsStore.getState().applyEvent(event);
    useSessionsStore.getState().applyEvent(event);
    useWorkspaceStore.getState().applyEvent(event);
    useVcsStore.getState().applyEvent(event);
    useLspStore.getState().applyEvent(event);
    usePtyStore.getState().applyEvent(event);
    useToastsStore.getState().applyEvent(event);
  }, []);

  const onReconnected = useCallback(() => {
    const { sessions, loadMessages } = useMessagesStore.getState();
    for (const sid of Object.keys(sessions)) void loadMessages(sid);
    void useSessionsStore.getState().refresh();
    void useVcsStore.getState().load();
    void useLspStore.getState().load();
  }, []);

  useOpencodeEvents(canUseEvents(location.pathname) ? { onEvent, onReconnected } : {});
  useEffect(() => {
    useThemeStore.getState().hydrate();
  }, []);

  return (
    <>
      <Routes>
        <Route path="/" element={<RootRoute />} />
        <Route path="/login" element={<Login />} />
        <Route path="/m" element={<Navigate to="/m/chat" replace />} />
        <Route path="/m" element={<MobileRouteGuard />}>
          <Route path="projects" element={<MobileProjectsPage />} />
          <Route path="chat" element={<MobileChatPage />} />
          <Route path="chat/:sessionId" element={<MobileChatPage />} />
          <Route path="files" element={<MobileFilesPage />} />
          <Route path="files/*" element={<MobileFilesPage />} />
          <Route path="terminal" element={<MobileTerminalPage />} />
          <Route path="terminal/:ptyId" element={<MobileTerminalPage />} />
          <Route path="me/*" element={<MobileMePage />} />
          <Route path="*" element={<MobileNotFound />} />
        </Route>
        <Route path="*" element={<NotFound />} />
      </Routes>
      <PermissionCenter />
      <ToastCenter />
    </>
  );
}
