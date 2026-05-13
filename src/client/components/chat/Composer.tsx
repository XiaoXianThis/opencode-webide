import { useEffect, useRef, useState } from "react";
import { AlertCircle, Paperclip, Send, Square, X } from "lucide-react";
import { Button, Chip, TextArea } from "@heroui/react";
import { useMessagesStore, type PromptPartInput } from "@/store/messages";
import { useModelsStore } from "@/store/models";
import { useAgentsStore } from "@/store/agents";
import { cn } from "@/lib/utils";
import { ModelPicker } from "./ModelPicker";
import { AgentPicker } from "./AgentPicker";

type FilePromptPartInput = Extract<PromptPartInput, { type: "file" }>;

interface PendingFilePart {
  id: string;
  name: string;
  part: FilePromptPartInput;
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener("load", () => {
      if (typeof reader.result === "string") resolve(reader.result);
      else reject(new Error("Unable to read dropped file"));
    });
    reader.addEventListener("error", () => reject(reader.error ?? new Error("Unable to read dropped file")));
    reader.readAsDataURL(file);
  });
}

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
  const [files, setFiles] = useState<PendingFilePart[]>([]);
  const [dragging, setDragging] = useState(false);
  const taRef = useRef<HTMLTextAreaElement>(null);

  // Reset draft when session changes
  useEffect(() => {
    setText("");
    setFiles([]);
  }, [sessionID]);

  // Auto-grow up to a max
  useEffect(() => {
    const ta = taRef.current;
    if (!ta) return;
    ta.style.height = "0px";
    ta.style.height = Math.min(ta.scrollHeight, 200) + "px";
  }, [text]);

  const submit = () => {
    if ((!text.trim() && files.length === 0) || streaming) return;
    const model =
      selectedProviderID && selectedModelID
        ? { providerID: selectedProviderID, modelID: selectedModelID }
        : undefined;
    const opts = {
      ...(selectedAgent ? { agent: selectedAgent } : {}),
      ...(model ? { model } : {}),
      ...(files.length > 0 ? { parts: files.map((file) => file.part) } : {}),
    };
    void send(sessionID, text, Object.keys(opts).length > 0 ? opts : undefined);
    setText("");
    setFiles([]);
  };

  const removeFile = (id: string) => setFiles((current) => current.filter((file) => file.id !== id));

  const addDroppedFiles = async (fileList: FileList) => {
    const next: PendingFilePart[] = [];
    for (const file of Array.from(fileList)) {
      const url = await readFileAsDataUrl(file);
      next.push({
        id: `${file.name}:${file.size}:${file.lastModified}:${url.length}`,
        name: file.name,
        part: {
          type: "file",
          mime: file.type || "application/octet-stream",
          filename: file.name,
          url,
        },
      });
    }
    setFiles((current) => [...current, ...next]);
  };

  const onDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    if (Array.from(event.dataTransfer.types).includes("Files")) {
      event.preventDefault();
      setDragging(true);
    }
  };

  const onDrop = (event: React.DragEvent<HTMLDivElement>) => {
    if (event.dataTransfer.files.length === 0) return;
    event.preventDefault();
    setDragging(false);
    void addDroppedFiles(event.dataTransfer.files);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      submit();
    }
  };

  return (
    <div
      className="border-t border-default-200 bg-content1 p-2"
      onDragOver={onDragOver}
      onDragLeave={() => setDragging(false)}
      onDrop={onDrop}
    >
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
      <div className="mb-2 grid min-w-0 grid-cols-1 gap-2 xl:grid-cols-2">
        <div className="min-w-0">
          <AgentPicker />
        </div>
        <div className="min-w-0">
          <ModelPicker />
        </div>
      </div>
      {files.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-1.5" aria-label="已附加文件">
          {files.map((file) => (
            <Chip
              key={file.id}
              size="sm"
              variant="flat"
              onClose={() => removeFile(file.id)}
            >
              <span className="inline-flex items-center gap-1">
                <Paperclip className="h-3 w-3" />
                {file.name}
              </span>
            </Chip>
          ))}
        </div>
      )}
      <div
        className={cn(
          "flex items-end gap-2 rounded-medium border bg-background p-2",
          dragging ? "border-primary bg-primary/5" : "border-default-200",
        )}
      >
        <TextArea
          ref={taRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={onKeyDown}
          rows={1}
          placeholder={streaming ? "生成中…" : "输入消息，Enter/Cmd+Enter 发送，Shift+Enter 换行，可拖入文件"}
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
            isDisabled={!text.trim() && files.length === 0}
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
