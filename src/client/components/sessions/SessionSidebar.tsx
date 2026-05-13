import { useEffect, useMemo, useState } from "react";
import type { Key } from "react";
import { GitFork, Link, Link2Off, Plus, RefreshCw, Search, Trash2 } from "lucide-react";
import { Button, EmptyState, Input, Label, ListBox, ScrollShadow, Spinner, Tooltip } from "@heroui/react";
import type { Session } from "@opencode-ai/sdk/client";
import { useSessionsStore } from "@/store/sessions";
import { formatNewSessionTitle, formatRelativeTime, formatSessionTitle } from "@/lib/utils";

interface SessionRow {
  session: Session;
  depth: number;
}

function flattenSessions(sessions: Session[], childrenByParent: Record<string, Session[]>): SessionRow[] {
  const rows: SessionRow[] = [];
  const seen = new Set<string>();
  const visit = (session: Session, depth: number) => {
    if (seen.has(session.id)) return;
    seen.add(session.id);
    rows.push({ session, depth });
    for (const child of childrenByParent[session.id] ?? []) visit(child, depth + 1);
  };
  for (const session of sessions.filter((item) => !item.parentID)) visit(session, 0);
  for (const session of sessions) visit(session, session.parentID ? 1 : 0);
  return rows;
}

export function SessionSidebar() {
  const activeId = useSessionsStore((s) => s.activeId);
  const status = useSessionsStore((s) => s.status);
  const error = useSessionsStore((s) => s.error);
  const childrenByParent = useSessionsStore((s) => s.childrenByParent);
  const searchQuery = useSessionsStore((s) => s.searchQuery);
  const refresh = useSessionsStore((s) => s.refresh);
  const create = useSessionsStore((s) => s.create);
  const remove = useSessionsStore((s) => s.remove);
  const rename = useSessionsStore((s) => s.rename);
  const fork = useSessionsStore((s) => s.fork);
  const share = useSessionsStore((s) => s.share);
  const unshare = useSessionsStore((s) => s.unshare);
  const setActive = useSessionsStore((s) => s.setActive);
  const setSearchQuery = useSessionsStore((s) => s.setSearchQuery);
  const filteredSessions = useSessionsStore((s) => s.filteredSessions);
  const [busy, setBusy] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [searchDraft, setSearchDraft] = useState(searchQuery);
  const sessions = filteredSessions();
  const rows = useMemo(
    () => (searchQuery.trim() ? sessions.map((session) => ({ session, depth: 0 })) : flattenSessions(sessions, childrenByParent)),
    [childrenByParent, searchQuery, sessions],
  );

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    const id = window.setTimeout(() => setSearchQuery(searchDraft), 250);
    return () => window.clearTimeout(id);
  }, [searchDraft, setSearchQuery]);

  const handleCreate = async () => {
    setBusy(true);
    try {
      await create(formatNewSessionTitle());
    } finally {
      setBusy(false);
    }
  };

  const onSelection = (keys: "all" | Set<Key>) => {
    if (keys === "all") return;
    const [first] = keys;
    if (typeof first === "string") setActive(first);
  };

  const saveTitle = async (id: string) => {
    const title = draft.trim();
    setEditingId(null);
    if (title) await rename(id, title);
  };

  return (
    <aside className="flex h-full w-64 shrink-0 flex-col border-r border-default-200 bg-content1">
      <header className="flex items-center justify-between gap-2 px-3 py-2">
        <span className="text-sm font-semibold tracking-wide text-foreground">会话</span>
        <div className="flex items-center gap-1">
          <Tooltip>
            <Tooltip.Trigger>
              <Button size="sm" variant="light" isIconOnly aria-label="刷新" onPress={() => void refresh()}>
                {status === "loading" ? <Spinner size="sm" /> : <RefreshCw className="h-4 w-4" />}
              </Button>
            </Tooltip.Trigger>
            <Tooltip.Content>刷新</Tooltip.Content>
          </Tooltip>
          <Tooltip>
            <Tooltip.Trigger>
              <Button size="sm" variant="light" isIconOnly aria-label="新建会话" isDisabled={busy} onPress={handleCreate}>
                <Plus className="h-4 w-4" />
              </Button>
            </Tooltip.Trigger>
            <Tooltip.Content>新建会话</Tooltip.Content>
          </Tooltip>
        </div>
      </header>
      <div className="px-3 pb-2">
        <Input aria-label="搜索会话" size="sm" value={searchDraft} onChange={(event) => setSearchDraft(event.target.value)} startContent={<Search className="h-3.5 w-3.5 text-default-500" />} placeholder="搜索标题" />
      </div>
      {error && <div role="alert" className="mx-3 mb-2 rounded-medium border border-danger bg-danger/10 px-2 py-1 text-tiny text-danger">{error}</div>}
      {rows.length === 0 && status === "ready" ? (
        <EmptyState className="m-3 gap-2 text-center"><div className="text-sm font-medium text-foreground">暂无会话</div><div className="text-xs text-default-500">点击右上角 + 新建</div></EmptyState>
      ) : (
        <ScrollShadow className="flex-1">
          <ListBox aria-label="会话列表" selectionMode="single" selectedKeys={activeId ? new Set([activeId]) : new Set()} onSelectionChange={onSelection} className="px-2 pb-2">
            {rows.map(({ session, depth }) => (
              <ListBox.Item key={session.id} id={session.id} textValue={session.title || session.id}>
                <div className="flex min-w-0 flex-1 flex-col gap-1" style={{ paddingLeft: depth * 12 }}>
                  {editingId === session.id ? (
                    <Input autoFocus aria-label={`编辑会话标题 ${session.title || session.id}`} size="sm" value={draft} onChange={(event) => setDraft(event.target.value)} onBlur={() => void saveTitle(session.id)} onKeyDown={(event) => { if (event.key === "Enter") void saveTitle(session.id); if (event.key === "Escape") setEditingId(null); }} />
                  ) : (
                    <Label aria-label={`加载子会话 ${session.title || session.id}`} className="min-w-0 truncate" onDoubleClick={() => { setEditingId(session.id); setDraft(session.title || ""); }}>{formatSessionTitle(session.title)}</Label>
                  )}
                  <span className="text-[10px] text-default-500">{formatRelativeTime(session.time?.updated)}{session.parentID ? " · 子会话" : ""}{session.revert ? " · 已回退" : ""}</span>
                </div>
                <Button size="sm" variant="light" isIconOnly aria-label={`分叉会话 ${session.title || session.id}`} onPress={() => void fork(session.id)}><GitFork className="h-3.5 w-3.5" /></Button>
                {session.share ? <Button size="sm" variant="light" isIconOnly aria-label={`取消分享 ${session.title || session.id}`} onPress={() => void unshare(session.id)}><Link2Off className="h-3.5 w-3.5" /></Button> : <Button size="sm" variant="light" isIconOnly aria-label={`分享会话 ${session.title || session.id}`} onPress={() => void share(session.id)}><Link className="h-3.5 w-3.5" /></Button>}
                <Button size="sm" variant="light" isIconOnly aria-label={`删除会话 ${session.title || session.id}`} onPress={() => { if (confirm(`删除会话 "${session.title || session.id}"？`)) void remove(session.id); }}><Trash2 className="h-3.5 w-3.5" /></Button>
              </ListBox.Item>
            ))}
          </ListBox>
        </ScrollShadow>
      )}
    </aside>
  );
}
