import { AlertCircle, Bot, Edit3, GitFork, RotateCcw, Undo2, User } from "lucide-react";
import { Avatar, Button, Spinner } from "@heroui/react";
import type { Message, Part, Session } from "@opencode-ai/sdk/client";
import { PartRenderer } from "./PartRenderer";
import { cn } from "@/lib/utils";

function messageMeta(info: Message): string {
  if (info.role === "user") {
    const model = info.model ? `${info.model.providerID}/${info.model.modelID}` : null;
    return ["you", info.agent, model].filter(Boolean).join(" / ");
  }
  return [
    "assistant",
    info.mode,
    info.providerID && info.modelID ? `${info.providerID}/${info.modelID}` : null,
  ]
    .filter(Boolean)
    .join(" / ");
}

interface MessageItemProps {
  info: Message;
  parts: Part[];
  revert?: Session["revert"];
  isAfterRevert?: boolean;
  onFork?: (messageID: string) => void;
  onRevert?: (messageID: string) => void;
  onUnrevert?: () => void;
  onEditResend?: (messageID: string) => void;
  searchQuery?: string;
}

export function MessageItem({ info, parts, revert, isAfterRevert = false, onFork, onRevert, onUnrevert, onEditResend, searchQuery = "" }: MessageItemProps) {
  const isUser = info.role === "user";
  const Icon = isUser ? User : Bot;
  const error = info.role === "assistant" ? info.error : undefined;
  const isRevertPoint = revert?.messageID === info.id;

  return (
    <article
      data-testid={`message-${info.id}`}
      data-reverted={isAfterRevert && !isRevertPoint ? "true" : undefined}
      className={cn(
        "group flex gap-2 px-3 py-2 transition-opacity",
        isUser && "bg-content1/40",
        isAfterRevert && !isRevertPoint && "opacity-45",
        searchQuery.trim() && "ring-1 ring-warning/30",
      )}
    >
      <Avatar
        size="sm"
        className={cn(
          "mt-0.5 h-6 w-6 shrink-0",
          isUser ? "bg-primary-100 text-primary" : "bg-default-100 text-foreground",
        )}
        aria-label={isUser ? "用户" : "助手"}
      >
        <Avatar.Fallback>
          <Icon className="h-3.5 w-3.5" />
        </Avatar.Fallback>
      </Avatar>
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <div className="flex items-center gap-2 text-[10px] uppercase tracking-wide text-default-500">
          <span>{messageMeta(info)}</span>
          {info.role === "assistant" && info.time?.completed && (
            <span>? {((info.time.completed - info.time.created) / 1000).toFixed(1)}s</span>
          )}
          <div className="ml-auto flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
            <Button
              size="sm"
              variant="light"
              isIconOnly
              aria-label={`分叉消息 ${info.id}`}
              onPress={() => onFork?.(info.id)}
              className="h-6 w-6 min-w-6"
            >
              <GitFork className="h-3.5 w-3.5" />
            </Button>
            {isUser && (
              <Button
                size="sm"
                variant="light"
                isIconOnly
                aria-label={`编辑重发消息 ${info.id}`}
                onPress={() => onEditResend?.(info.id)}
                className="h-6 w-6 min-w-6"
              >
                <Edit3 className="h-3.5 w-3.5" />
              </Button>
            )}
            {isRevertPoint ? (
              <Button
                size="sm"
                variant="light"
                color="warning"
                isIconOnly
                aria-label="恢复会话"
                onPress={onUnrevert}
                className="h-6 w-6 min-w-6"
              >
                <Undo2 className="h-3.5 w-3.5" />
              </Button>
            ) : (
              <Button
                size="sm"
                variant="light"
                isIconOnly
                aria-label={`回退到消息 ${info.id}`}
                onPress={() => onRevert?.(info.id)}
                className="h-6 w-6 min-w-6"
              >
                <RotateCcw className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        </div>
        {parts.length === 0 && info.role === "assistant" && !info.time?.completed && (
          <div className="flex items-center gap-1.5 text-xs text-default-500">
            <Spinner size="sm" />
            思考中…
          </div>
        )}
        {parts.map((p) => (
          <PartRenderer key={p.id} part={p} searchQuery={searchQuery} />
        ))}
        {error && (
          <div
            role="alert"
            className="flex items-start gap-1.5 rounded-medium border border-danger bg-danger/10 px-2 py-1 text-xs text-danger"
          >
            <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>
              {error.name}
              {"data" in error && (error.data as { message?: string })?.message
                ? `: ${(error.data as { message: string }).message}`
                : ""}
            </span>
          </div>
        )}
      </div>
    </article>
  );
}
