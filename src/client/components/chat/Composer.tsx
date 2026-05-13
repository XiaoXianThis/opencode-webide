import { useEffect, useRef, useState } from "react";
import { AlertCircle, Send, Square, X } from "lucide-react";
import { Button, TextArea } from "@heroui/react";
import { useMessagesStore } from "@/store/messages";
import { useModelsStore } from "@/store/models";
import { useAgentsStore } from "@/store/agents";
import { ModelPicker } from "./ModelPicker";
import { AgentPicker } from "./AgentPicker";

export function Composer({ sessionID }: { sessionID: string }) {
  const streaming = useMessagesStore((s) => s.streaming[sessionID] ?? false);
  const send = useMessagesStore((s) => s.sendPrompt);
  const abort = useMessagesStore((s) => s.abort);
  const selectedProviderID = useModelsStore((s) => s.selectedProviderID);
  const selectedModelID = useModelsStore((s) => s.selectedModelID);
  const fallbackNotice = useModelsStore((s) => s.fallbackNotice);
  const dismissFallbackNotice = useModelsStore((s) => s.dismissFallbackNotice);
  const selectedAgent = useAgentsStore((s) => s.selectedAgent);
  const [text, setText] = useState("");
  const taRef = useRef<HTMLTextAreaElement>(null);

  // Reset draft when session changes
  useEffect(() => {
    setText("");
  }, [sessionID]);

  // Auto-grow up to a max
  useEffect(() => {
    const ta = taRef.current;
    if (!ta) return;
    ta.style.height = "0px";
    ta.style.height = Math.min(ta.scrollHeight, 200) + "px";
  }, [text]);

  const submit = () => {
    if (!text.trim() || streaming) return;
    const model =
      selectedProviderID && selectedModelID
        ? { providerID: selectedProviderID, modelID: selectedModelID }
        : undefined;
    const opts = {
      ...(selectedAgent ? { agent: selectedAgent } : {}),
      ...(model ? { model } : {}),
    };
    void send(sessionID, text, Object.keys(opts).length > 0 ? opts : undefined);
    setText("");
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      submit();
    }
  };

  return (
    <div className="border-t border-default-200 bg-content1 p-2">
      {fallbackNotice && (
        <div
          role="status"
          className="mb-2 flex items-center gap-2 rounded-medium border border-warning bg-warning/10 px-2 py-1 text-xs text-warning-700"
        >
          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
          <span className="flex-1">{fallbackNotice}</span>
          <Button
            size="sm"
            variant="light"
            isIconOnly
            aria-label="Dismiss model notice"
            className="h-5 w-5 min-w-5 text-warning-700"
            onPress={dismissFallbackNotice}
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      )}
      <div className="mb-2 flex items-center gap-2">
        <AgentPicker />
        <ModelPicker />
      </div>
      <div className="flex items-end gap-2 rounded-medium border border-default-200 bg-background p-2">
        <TextArea
          ref={taRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={onKeyDown}
          rows={1}
          placeholder={streaming ? "生成中…" : "输入消息，Enter 发送，Shift+Enter 换行"}
          aria-label="输入消息"
          className="flex-1 resize-none border-0 bg-transparent px-0 text-sm leading-relaxed shadow-none outline-none focus:ring-0"
        />
        {streaming ? (
          <Button
            size="sm"
            color="danger"
            isIconOnly
            aria-label="中止生成"
            title="中止生成"
            onPress={() => void abort(sessionID)}
          >
            <Square className="h-4 w-4" />
          </Button>
        ) : (
          <Button
            size="sm"
            color="primary"
            isIconOnly
            isDisabled={!text.trim()}
            aria-label="发送"
            title="发送"
            onPress={submit}
          >
            <Send className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
