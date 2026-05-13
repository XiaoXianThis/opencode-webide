import { useEffect, useMemo, useRef, useState } from "react";
import { FileSearch, Search } from "lucide-react";
import { Button, EmptyState, Kbd, SearchField, Spinner } from "@heroui/react";
import { oc } from "@/lib/opencode";
import { cn } from "@/lib/utils";
import { useWorkspaceStore } from "@/store/workspace";

type PaletteTab = "files" | "text" | "symbols";

interface PaletteItem {
  id: string;
  label: string;
  detail: string;
  path: string;
}

function highlight(label: string, query: string): Array<{ text: string; hit: boolean }> {
  if (!query) return [{ text: label, hit: false }];
  const lower = label.toLowerCase();
  const chars = query.toLowerCase().split("");
  const hitIndexes = new Set<number>();
  let cursor = 0;
  for (const char of chars) {
    const found = lower.indexOf(char, cursor);
    if (found === -1) return [{ text: label, hit: false }];
    hitIndexes.add(found);
    cursor = found + 1;
  }
  return label.split("").map((text, index) => ({ text, hit: hitIndexes.has(index) }));
}

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<PaletteTab>("files");
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<PaletteItem[]>([]);
  const [active, setActive] = useState(0);
  const [loading, setLoading] = useState(false);
  const openFile = useWorkspaceStore((s) => s.openFile);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && (event.key.toLowerCase() === "p" || event.key.toLowerCase() === "k")) {
        event.preventDefault();
        setOpen(true);
      }
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handle = setTimeout(() => {
      const search = async () => {
        setLoading(true);
        try {
          if (tab === "files") {
            const { data } = await oc.find.files({ query: { query, dirs: "false" } });
            setItems(data.map((path) => ({ id: `file:${path}`, label: path, detail: "file", path })));
          } else if (tab === "text") {
            const { data } = await oc.find.text({ query: { pattern: query || " " } });
            setItems(data.map((match) => ({ id: `text:${match.path.text}:${match.line_number}`, label: match.path.text, detail: `L${match.line_number}: ${match.lines.text.trim()}`, path: match.path.text })));
          } else {
            const { data } = await oc.find.symbols({ query: { query } });
            setItems(data.map((symbol) => ({ id: `symbol:${symbol.location.uri}:${symbol.name}`, label: symbol.name, detail: symbol.location.uri, path: symbol.location.uri.replace(/^file:\/\//, "") })));
          }
          setActive(0);
        } finally {
          setLoading(false);
        }
      };
      void search();
    }, 180);
    return () => clearTimeout(handle);
  }, [open, query, tab]);

  const tabs = useMemo<Array<{ id: PaletteTab; label: string }>>(() => [{ id: "files", label: "文件" }, { id: "text", label: "文本" }, { id: "symbols", label: "符号" }], []);
  if (!open) return null;
  const jump = () => {
    const item = items[active];
    if (!item) return;
    void openFile(item.path);
    setOpen(false);
  };
  return <div role="dialog" aria-modal="true" aria-label="命令面板" className="fixed inset-0 z-40 bg-background/70 p-6 backdrop-blur-sm"><div className="mx-auto mt-16 flex w-full max-w-2xl flex-col overflow-hidden rounded-large border border-default-200 bg-content1 shadow-large"><div className="border-b border-default-200 p-3"><SearchField aria-label="搜索文件" value={query} onChange={setQuery} fullWidth><SearchField.Group><Search className="h-4 w-4 text-default-500" /><SearchField.Input ref={inputRef} placeholder="跳转到文件、文本或符号" onKeyDown={(event) => { if (event.key === "ArrowDown") { event.preventDefault(); setActive((value) => Math.min(value + 1, items.length - 1)); } if (event.key === "ArrowUp") { event.preventDefault(); setActive((value) => Math.max(value - 1, 0)); } if (event.key === "Enter") { event.preventDefault(); jump(); } }} /><SearchField.ClearButton /></SearchField.Group></SearchField><div className="mt-2 flex items-center gap-2">{tabs.map((entry) => <Button key={entry.id} size="sm" variant={entry.id === tab ? "flat" : "light"} color={entry.id === tab ? "primary" : "default"} onPress={() => setTab(entry.id)}>{entry.label}</Button>)}<Kbd className="ml-auto">Enter</Kbd></div></div><div className="max-h-96 overflow-auto p-2">{loading ? <div className="flex justify-center p-6"><Spinner size="sm" /></div> : items.length === 0 ? <EmptyState className="gap-2 p-8 text-center"><FileSearch className="h-8 w-8 opacity-40" /><div className="text-sm text-default-500">没有匹配结果</div></EmptyState> : items.map((item, index) => <button key={item.id} className={cn("flex w-full flex-col rounded-medium px-3 py-2 text-left text-xs", index === active ? "bg-primary/15 text-foreground" : "text-default-600 hover:bg-default-100")} onMouseEnter={() => setActive(index)} onClick={() => { void openFile(item.path); setOpen(false); }}><span>{highlight(item.label, query).map((part, partIndex) => <mark key={`${item.id}-${partIndex}`} className={part.hit ? "bg-warning/30 text-warning" : "bg-transparent text-inherit"}>{part.text}</mark>)}</span><span className="truncate text-tiny text-default-500">{item.detail}</span></button>)}</div></div></div>;
}
