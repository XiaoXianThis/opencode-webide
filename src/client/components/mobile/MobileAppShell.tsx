import { Outlet } from "react-router-dom";
import { PermissionCenter } from "@/components/permissions/PermissionCenter";
import { ToastCenter } from "@/components/layout/ToastCenter";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { useVisualViewportHeight } from "@/hooks/useVisualViewportHeight";
import { MobileBottomNav } from "./MobileBottomNav";
import { MobileTopBar } from "./MobileTopBar";

export function MobileAppShell() {
  const online = useOnlineStatus();
  useVisualViewportHeight();

  return (
    <div className="mobile-app-shell flex w-full flex-col overflow-hidden bg-background text-foreground">
      <MobileTopBar />
      {!online ? <div role="status" className="border-b border-warning/40 bg-warning/15 px-3 py-2 text-xs font-medium text-warning-700">已离线，仅可浏览缓存内容</div> : null}
      <main className="min-h-0 flex-1 overflow-y-auto px-3 py-3 pb-[calc(5rem+env(safe-area-inset-bottom))]">
        <Outlet />
      </main>
      <MobileBottomNav />
      <PermissionCenter />
      <ToastCenter />
    </div>
  );
}
