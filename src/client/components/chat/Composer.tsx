import { useEffect, useRef, useState } from "react";
import { Send, Square } from "lucide-react";
import { Button, TextArea } from "@heroui/react";
import { useMessagesStore } from "@/store/messages";
import { useModelsStore } from "@/store/models";
import { ModelPicker } from "./ModelPicker";

export function Composer({ sessionID }: { sessionID: string }) {
  const streaming = useMessagesStore((s) => s.streaming[sessionID] ?? false);
  const send = useMessagesStore((s) => s.sendPrompt);
  const abort = useMessagesStore((s) => s.abort);
  const selectedProviderID = useModelsStore((s) => s.selectedProviderID);
  const selectedModelID = useModelsStore((s) => s.selectedModelID);
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
    void send(sessionID, text, model ? { model } : undefined);
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
      <div className="mb-2 flex items-center gap-2">
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
