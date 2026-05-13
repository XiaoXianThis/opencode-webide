import { Moon, Sun, Terminal } from "lucide-react";
import { Button, Chip, Tooltip } from "@heroui/react";
import { useThemeStore } from "@/store/theme";

export function TopBar() {
  const mode = useThemeStore((s) => s.mode);
  const toggle = useThemeStore((s) => s.toggle);
  const isDark = mode === "dark";

  return (
    <header className="flex h-10 shrink-0 items-center gap-2 border-b border-default-200 bg-content1 px-3">
      <Terminal className="h-4 w-4 text-primary" />
      <span className="text-sm font-semibold text-foreground">opencode WebIDE</span>
      <Chip size="sm" variant="flat" color="default" className="text-[10px] uppercase">
        M6
      </Chip>
      <Tooltip content={isDark ? "切换到浅色主题" : "切换到深色主题"} placement="bottom">
        <Button
          size="sm"
          variant="light"
          isIconOnly
          className="ml-auto h-7 w-7 min-w-7 text-default-500"
          aria-label={isDark ? "切换到浅色主题" : "切换到深色主题"}
          onPress={toggle}
        >
          {isDark ? <Moon className="h-3.5 w-3.5" /> : <Sun className="h-3.5 w-3.5" />}
        </Button>
      </Tooltip>
    </header>
  );
}
