import { useEffect, useRef } from "react";
import { ShieldAlert } from "lucide-react";
import { Button, Chip } from "@heroui/react";
import type { Permission } from "@opencode-ai/sdk/client";
import type { PermissionResponse } from "@/store/permissions";
import { cn } from "@/lib/utils";

export interface PermissionDialogProps {
  permission: Permission;
  /** Number of pending requests behind this one (drives the "+N more" hint). */
  queueDepth?: number;
  /** True while the SDK call is in-flight; disables the buttons. */
  isReplying?: boolean;
  onReply: (response: PermissionResponse) => void;
}

/**
 * Modal-style permission prompt. Implemented as a fixed-position overlay
 * (not HeroUI `Modal`) because react-aria-components `Modal`'s overlay
 * sizing path stalls under happy-dom. The behaviour we need is small:
 * trap-and-render over the page, ESC to reject, three action buttons.
 */
export function PermissionDialog({
  permission,
  queueDepth = 0,
  isReplying = false,
  onReply,
}: PermissionDialogProps) {
  const rejectRef = useRef(onReply);
  rejectRef.current = onReply;

  // Global ESC -> reject. Equivalent to a Modal cancellation.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        rejectRef.current("reject");
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const metaEntries = Object.entries(permission.metadata ?? {});

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="permission-title"
      data-testid="permission-dialog"
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/70 p-4 backdrop-blur-sm"
    >
      <div
        className={cn(
          "w-full max-w-md rounded-large border border-default-200 bg-content1 shadow-large",
        )}
      >
        <header className="flex items-start gap-2 border-b border-default-200 p-3">
          <ShieldAlert className="mt-0.5 h-4 w-4 text-warning" aria-hidden />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 id="permission-title" className="truncate text-sm font-medium text-foreground">
                {permission.title}
              </h3>
              {queueDepth > 0 && (
                <Chip
                  size="sm"
                  variant="flat"
                  color="warning"
                  className="h-4 text-[10px]"
                  data-testid="permission-queue-depth"
                >
                  +{queueDepth} more
                </Chip>
              )}
            </div>
            <div className="mt-0.5 font-mono text-[10px] text-default-500">
              {permission.type}
              {permission.callID ? ` · ${permission.callID}` : ""}
            </div>
          </div>
        </header>

        {metaEntries.length > 0 && (
          <div className="space-y-1 border-b border-default-200 p-3 text-xs" data-testid="permission-metadata">
            {metaEntries.map(([k, v]) => (
              <div key={k} className="flex gap-2">
                <span className="w-24 shrink-0 text-default-500">{k}</span>
                <span className="min-w-0 flex-1 break-words font-mono text-foreground">
                  {typeof v === "string" ? v : JSON.stringify(v)}
                </span>
              </div>
            ))}
          </div>
        )}

        <footer className="flex items-center justify-end gap-2 p-3">
          <Button
            size="sm"
            variant="flat"
            color="danger"
            isDisabled={isReplying}
            onPress={() => onReply("reject")}
            data-testid="permission-reject"
          >
            拒绝
          </Button>
          <Button
            size="sm"
            variant="flat"
            isDisabled={isReplying}
            onPress={() => onReply("once")}
            data-testid="permission-once"
          >
            允许一次
          </Button>
          <Button
            size="sm"
            color="primary"
            isDisabled={isReplying}
            onPress={() => onReply("always")}
            data-testid="permission-always"
          >
            始终允许
          </Button>
        </footer>
      </div>
    </div>
  );
}
