import { AlertCircle, CheckCircle2, Info, TriangleAlert, X } from "lucide-react";
import { Button } from "@heroui/react";
import { useToastsStore, type ToastVariant } from "@/store/toasts";
import { cn } from "@/lib/utils";

const ICONS = {
  info: Info,
  success: CheckCircle2,
  warning: TriangleAlert,
  error: AlertCircle,
} satisfies Record<ToastVariant, typeof Info>;

const TONES = {
  info: "border-primary/30 bg-primary/10 text-primary",
  success: "border-success/30 bg-success/10 text-success",
  warning: "border-warning/30 bg-warning/10 text-warning",
  error: "border-danger/30 bg-danger/10 text-danger",
} satisfies Record<ToastVariant, string>;

export function ToastCenter() {
  const toasts = useToastsStore((s) => s.toasts);
  const dismiss = useToastsStore((s) => s.dismiss);

  if (toasts.length === 0) return null;

  return (
    <div aria-live="polite" aria-label="通知" className="fixed right-3 top-12 z-50 flex w-80 max-w-[calc(100vw-1.5rem)] flex-col gap-2">
      {toasts.map((toast) => {
        const Icon = ICONS[toast.variant];
        return (
          <div
            key={toast.id}
            role="status"
            className="rounded-large border border-default-200 bg-content1 p-2 text-sm text-foreground shadow-large"
          >
            <div className="flex items-start gap-2">
              <span className={cn("mt-0.5 rounded-medium border p-1", TONES[toast.variant])}>
                <Icon className="h-3.5 w-3.5" aria-hidden />
              </span>
              <div className="min-w-0 flex-1">
                {toast.title && <div className="truncate text-xs font-semibold text-foreground">{toast.title}</div>}
                <div className="text-xs leading-5 text-default-600">{toast.message}</div>
              </div>
              <Button
                size="sm"
                variant="light"
                isIconOnly
                className="h-6 w-6 min-w-6 text-default-500"
                aria-label="关闭通知"
                onPress={() => dismiss(toast.id)}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
