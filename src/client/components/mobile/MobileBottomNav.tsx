import { FolderKanban, MessageCircle, Files, TerminalSquare, UserRound } from "lucide-react";
import { NavLink } from "react-router-dom";
import { cn } from "@/lib/utils";

const items = [
  { to: "/m/projects", label: "项目", icon: FolderKanban },
  { to: "/m/chat", label: "聊天", icon: MessageCircle },
  { to: "/m/files", label: "文件", icon: Files },
  { to: "/m/terminal", label: "终端", icon: TerminalSquare },
  { to: "/m/me", label: "我的", icon: UserRound },
];

export function MobileBottomNav() {
  return (
    <nav className="mobile-bottom-nav grid grid-cols-5 border-t border-default-200 bg-content1/95 px-1 pb-[max(env(safe-area-inset-bottom),0.5rem)] pt-1 backdrop-blur" aria-label="移动端主导航">
      {items.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          className={({ isActive }) =>
            cn(
              "flex min-h-11 flex-col items-center justify-center gap-0.5 rounded-large px-1 text-[11px] font-medium transition-colors",
              isActive ? "bg-primary/10 text-primary" : "text-default-500 hover:bg-default-100 hover:text-foreground",
            )
          }
        >
          <item.icon className="h-5 w-5" />
          <span>{item.label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
