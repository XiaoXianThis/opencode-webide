import { ChevronLeft, Menu } from "lucide-react";
import { Button } from "@heroui/react";
import { useLocation, useNavigate } from "react-router-dom";
import { useProjectsStore } from "@/store/projects";

function titleForPath(pathname: string): string {
  if (pathname.startsWith("/m/projects")) return "项目";
  if (pathname.startsWith("/m/chat")) return "聊天";
  if (pathname.startsWith("/m/files")) return "文件";
  if (pathname.startsWith("/m/terminal")) return "终端";
  if (pathname.startsWith("/m/me/provider")) return "模型 / Provider";
  if (pathname.startsWith("/m/me/permissions")) return "权限中心";
  if (pathname.startsWith("/m/me/account")) return "账户";
  if (pathname.startsWith("/m/me")) return "我的";
  return "opencode";
}

function backTarget(pathname: string): string | null {
  if (pathname.startsWith("/m/me/") && pathname !== "/m/me") return "/m/me";
  return null;
}

export function MobileTopBar() {
  const location = useLocation();
  const navigate = useNavigate();
  const activeProject = useProjectsStore((s) => s.active());
  const target = backTarget(location.pathname);
  const canGoBack =
    Boolean(target) || location.pathname.split("/").filter(Boolean).length > 2;

  return (
    <header className="mobile-top-bar flex min-h-12 shrink-0 items-center gap-2 border-b border-default-200 bg-content1/95 px-3 pt-[env(safe-area-inset-top)] backdrop-blur">
      {canGoBack ? (
        <Button
          isIconOnly
          size="sm"
          variant="light"
          aria-label="返回"
          onPress={() => (target ? navigate(target) : navigate(-1))}
        >
          <ChevronLeft className="h-5 w-5" />
        </Button>
      ) : (
        <span
          className="flex h-8 w-8 shrink-0 items-center justify-center text-default-400"
          aria-hidden="true"
        >
          <Menu className="h-5 w-5" />
        </span>
      )}
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-semibold text-foreground">
          {titleForPath(location.pathname)}
        </div>
        <div className="truncate text-[11px] text-default-500">
          {activeProject?.worktree ?? "未选择项目"}
        </div>
      </div>
    </header>
  );
}
