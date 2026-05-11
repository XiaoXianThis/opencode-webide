import { User, Bot, AlertCircle } from "lucide-react";
import { Avatar, Spinner } from "@heroui/react";
import type { Message, Part } from "@opencode-ai/sdk/client";
import { PartRenderer } from "./PartRenderer";
import { cn } from "@/lib/utils";

interface MessageItemProps {
  info: Message;
  parts: Part[];
}

export function MessageItem({ info, parts }: MessageItemProps) {
  const isUser = info.role === "user";
  const Icon = isUser ? User : Bot;
  const error = info.role === "assistant" ? info.error : undefined;

  return (
    <article className={cn("flex gap-2 px-3 py-2", isUser && "bg-content1/40")}>
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
          <span>
            {isUser
              ? "you"
              : `assistant${info.providerID ? ` · ${info.providerID}/${info.modelID}` : ""}`}
          </span>
          {info.role === "assistant" && info.time?.completed && (
            <span>· {((info.time.completed - info.time.created) / 1000).toFixed(1)}s</span>
          )}
        </div>
        {parts.length === 0 && info.role === "assistant" && !info.time?.completed && (
          <div className="flex items-center gap-1.5 text-xs text-default-500">
            <Spinner size="sm" />
            思考中…
          </div>
        )}
        {parts.map((p) => (
          <PartRenderer key={p.id} part={p} />
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
