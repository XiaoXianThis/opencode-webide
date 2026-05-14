import { useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { Button, Chip, EmptyState, Input, Spinner } from "@heroui/react";
import {
  CheckCircle2,
  ChevronRight,
  Cpu,
  FileText,
  Folder,
  KeyRound,
  LogOut,
  Moon,
  Plus,
  RefreshCw,
  Search,
  ShieldAlert,
  Sparkles,
  Square,
  Sun,
  TerminalSquare,
  Trash2,
  Wifi,
} from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";
import type { FileNode } from "@opencode-ai/sdk/client";
import { Composer } from "@/components/chat/Composer";
import { MessageList } from "@/components/chat/MessageList";
import { SessionSidebar } from "@/components/sessions/SessionSidebar";
import { FileStatusBadge } from "@/components/workspace/FileStatusBadge";
import { useInstallPrompt } from "@/hooks/useInstallPrompt";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { getCsrfToken, logout } from "@/lib/auth";
import { useFilesStore } from "@/store/files";
import { useMessagesStore } from "@/store/messages";
import { useModelsStore } from "@/store/models";
import { usePermissionsStore } from "@/store/permissions";
import { useProjectsStore } from "@/store/projects";
import { usePtyStore } from "@/store/pty";
import { useSessionsStore } from "@/store/sessions";
import { useThemeStore } from "@/store/theme";
import { useWorkspaceStore } from "@/store/workspace";
import { cn } from "@/lib/utils";

const ROOT_PATH = ".";
const EMPTY_FILE_NODES: FileNode[] = [];

function encodeFilePath(path: string): string {
  return path.split("/").map(encodeURIComponent).join("/");
}

function decodeRoutePath(path: string | undefined): string {
  if (!path) return ROOT_PATH;
  return path.split("/").map(decodeURIComponent).join("/");
}

function parentPath(path: string): string {
  if (path === ROOT_PATH) return ROOT_PATH;
  const parts = path.split("/").filter(Boolean);
  parts.pop();
  return parts.length === 0 ? ROOT_PATH : parts.join("/");
}

function FileNodeRow({ node }: { node: FileNode }) {
  const navigate = useNavigate();
  const openFile = useWorkspaceStore((s) => s.openFile);
  const status = useFilesStore((s) => s.statusByPath[node.path]);

  const open = async () => {
    if (node.type === "directory") {
      navigate(`/m/files/${encodeFilePath(node.path)}`);
      return;
    }
    await openFile(node.path);
    navigate(`/m/files/${encodeFilePath(node.path)}`);
  };

  return (
    <button
      type="button"
      onClick={() => void open()}
      className="flex min-h-12 w-full items-center gap-3 rounded-large border border-default-200 bg-content1 px-3 py-2 text-left shadow-sm"
    >
      {node.type === "directory" ? (
        <Folder className="h-5 w-5 shrink-0 text-primary" />
      ) : (
        <FileText className="h-5 w-5 shrink-0 text-default-500" />
      )}
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium text-foreground">
          {node.name}
        </div>
        <div className="truncate text-[11px] text-default-500">{node.path}</div>
      </div>
      <FileStatusBadge status={status} />
    </button>
  );
}

export function MobileProjectsPage() {
  const projects = useProjectsStore((s) => s.projects);
  const activeProjectId = useProjectsStore((s) => s.activeProjectId);
  const status = useProjectsStore((s) => s.status);
  const error = useProjectsStore((s) => s.error);
  const load = useProjectsStore((s) => s.load);
  const select = useProjectsStore((s) => s.select);
  const navigate = useNavigate();
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (status === "idle") void load();
  }, [load, status]);

  const filtered = useMemo(
    () =>
      projects.filter((project) =>
        project.worktree
          .toLocaleLowerCase()
          .includes(query.trim().toLocaleLowerCase()),
      ),
    [projects, query],
  );

  return (
    <section className="space-y-3" aria-label="移动项目列表">
      <div className="flex items-center gap-2">
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="搜索项目路径"
          aria-label="搜索项目"
        />
        <Button
          isIconOnly
          size="sm"
          variant="flat"
          aria-label="刷新项目"
          onPress={() => void load()}
        >
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>
      {status === "loading" ? (
        <div className="flex justify-center py-8">
          <Spinner size="sm" />
          <span className="sr-only">加载项目</span>
        </div>
      ) : null}
      {error ? (
        <div
          role="alert"
          className="rounded-large border border-danger bg-danger/10 p-3 text-sm text-danger"
        >
          {error}
        </div>
      ) : null}
      {filtered.length === 0 && status === "ready" ? (
        <EmptyState className="py-10 text-center">暂无项目</EmptyState>
      ) : null}
      <div className="space-y-2">
        {filtered.map((project) => (
          <button
            key={project.id}
            type="button"
            onClick={() => {
              select(project.id);
              navigate("/m/chat");
            }}
            className={cn(
              "flex min-h-16 w-full items-center gap-3 rounded-large border bg-content1 p-3 text-left shadow-sm",
              project.id === activeProjectId
                ? "border-primary"
                : "border-default-200",
            )}
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-large bg-primary/10 text-primary">
              <Folder className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-semibold text-foreground">
                {project.worktree.split(/[\\/]/).filter(Boolean).at(-1) ??
                  project.worktree}
              </div>
              <div className="truncate text-xs text-default-500">
                {project.worktree}
              </div>
            </div>
            {project.id === activeProjectId ? (
              <CheckCircle2 className="h-5 w-5 text-primary" />
            ) : null}
          </button>
        ))}
      </div>
      <div className="rounded-large border border-default-200 bg-content1 p-3 text-xs text-default-500">
        新增/打开本机路径需要后端项目写
        API；当前移动端复用已有项目列表与本地切换能力。
      </div>
    </section>
  );
}

export function MobileChatPage() {
  const params = useParams();
  const navigate = useNavigate();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const drawerInitialActiveId = useRef<string | null>(null);
  const [messageSearch, setMessageSearch] = useState("");
  const activeId = useSessionsStore((s) => s.activeId);
  const active = useSessionsStore(
    (s) => s.sessions.find((session) => session.id === s.activeId) ?? null,
  );
  const setActive = useSessionsStore((s) => s.setActive);
  const summarize = useSessionsStore((s) => s.summarize);
  const loadMessages = useMessagesStore((s) => s.loadMessages);
  const streaming = useMessagesStore((s) =>
    activeId ? (s.streaming[activeId] ?? false) : false,
  );
  const abort = useMessagesStore((s) => s.abort);
  const selectedProviderID = useModelsStore((s) => s.selectedProviderID);
  const selectedModelID = useModelsStore((s) => s.selectedModelID);
  const pendingPermissions = usePermissionsStore((s) =>
    activeId ? (s.bySession[activeId]?.length ?? 0) : 0,
  );

  useEffect(() => {
    if (params.sessionId) setActive(params.sessionId);
  }, [params.sessionId, setActive]);

  useEffect(() => {
    if (activeId) void loadMessages(activeId);
  }, [activeId, loadMessages]);

  useEffect(() => {
    setMessageSearch("");
  }, [activeId]);

  useEffect(() => {
    if (!drawerOpen || !activeId || activeId === drawerInitialActiveId.current)
      return;
    setDrawerOpen(false);
    navigate(`/m/chat/${encodeURIComponent(activeId)}`);
  }, [activeId, drawerOpen, navigate]);

  const canSummarize = Boolean(
    activeId && selectedProviderID && selectedModelID,
  );

  return (
    <section className="flex min-h-full flex-col gap-3" aria-label="移动聊天">
      <div className="rounded-large border border-default-200 bg-content1 p-3 shadow-sm">
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="flat"
            onPress={() => {
              drawerInitialActiveId.current = activeId;
              setDrawerOpen((value) => !value);
            }}
          >
            会话列表
          </Button>
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-semibold text-foreground">
              {active?.title || (active ? "未命名会话" : "未选择会话")}
            </div>
            <div className="truncate text-xs text-default-500">
              当前聊天操作
            </div>
          </div>
          {pendingPermissions > 0 ? (
            <Chip
              size="sm"
              color="danger"
              variant="soft"
              data-testid="mobile-chat-permission-indicator"
            >
              <span className="inline-flex items-center gap-1">
                <ShieldAlert className="h-3 w-3" />
                {pendingPermissions}
              </span>
            </Chip>
          ) : null}
        </div>
        {activeId ? (
          <div className="mt-3 grid grid-cols-2 gap-2">
            <Button
              size="sm"
              variant="flat"
              isDisabled={!canSummarize}
              startContent={<Sparkles className="h-4 w-4" />}
              onPress={() => {
                if (!activeId || !selectedProviderID || !selectedModelID)
                  return;
                void summarize(activeId, {
                  providerID: selectedProviderID,
                  modelID: selectedModelID,
                });
              }}
            >
              总结
            </Button>
            <Button
              size="sm"
              variant="flat"
              color="danger"
              isDisabled={!streaming}
              startContent={<Square className="h-4 w-4" />}
              onPress={() => {
                if (activeId) void abort(activeId);
              }}
            >
              中止
            </Button>
          </div>
        ) : null}
      </div>
      {drawerOpen ? (
        <div className="rounded-large border border-default-200 bg-content1 shadow-lg">
          <SessionSidebar embedded />
        </div>
      ) : null}
      {activeId ? (
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-default-500" />
          <Input
            aria-label="搜索当前会话消息"
            value={messageSearch}
            onChange={(event) => setMessageSearch(event.target.value)}
            className="pl-8"
            placeholder="搜索当前会话消息"
          />
        </div>
      ) : null}
      <div className="flex min-h-[55vh] flex-1 flex-col overflow-hidden rounded-large border border-default-200 bg-content1">
        {activeId ? (
          <div className="min-h-0 flex-1 overflow-y-auto">
            <MessageList sessionID={activeId} searchQuery={messageSearch} />
          </div>
        ) : (
          <EmptyState className="flex-1 justify-center text-center">
            请选择或新建会话
          </EmptyState>
        )}
        {activeId ? <Composer sessionID={activeId} /> : null}
      </div>
    </section>
  );
}

export function MobileFilesPage() {
  const params = useParams();
  const routePath = decodeRoutePath(params["*"]);
  const nodes = useFilesStore(
    (s) => s.nodesByPath[routePath] ?? EMPTY_FILE_NODES,
  );
  const status = useFilesStore((s) => s.status);
  const error = useFilesStore((s) => s.error);
  const refresh = useFilesStore((s) => s.refresh);
  const refreshStatus = useFilesStore((s) => s.refreshStatus);
  const activeTabId = useWorkspaceStore((s) => s.activeTabId);
  const active = useWorkspaceStore(
    (s) => s.tabs.find((tab) => tab.id === s.activeTabId) ?? null,
  );
  const content = useWorkspaceStore((s) =>
    active ? s.buffers[active.path] : undefined,
  );
  const navigate = useNavigate();

  useEffect(() => {
    void refresh(routePath);
    void refreshStatus();
  }, [refresh, refreshStatus, routePath]);

  if (active && active.path === routePath) {
    return (
      <section
        className="flex min-h-full flex-col gap-3"
        aria-label="移动文件预览"
      >
        <Button
          size="sm"
          variant="flat"
          className="self-start"
          onPress={() =>
            navigate(`/m/files/${encodeFilePath(parentPath(active.path))}`)
          }
        >
          返回目录
        </Button>
        <div className="rounded-large border border-default-200 bg-content1 p-3">
          <div className="mb-2 text-sm font-semibold text-foreground">
            {active.name}
          </div>
          <pre className="max-h-[60vh] overflow-auto rounded-medium bg-background p-3 font-mono text-xs leading-relaxed text-default-700">
            <code>{content ?? "Loading..."}</code>
          </pre>
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-3" aria-label="移动文件管理">
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          variant="flat"
          isDisabled={routePath === ROOT_PATH}
          onPress={() =>
            navigate(
              routePath === ROOT_PATH
                ? "/m/files"
                : `/m/files/${encodeFilePath(parentPath(routePath))}`,
            )
          }
        >
          上级
        </Button>
        <div className="min-w-0 flex-1 truncate text-xs text-default-500">
          {routePath}
        </div>
        <Button
          isIconOnly
          size="sm"
          variant="flat"
          aria-label="刷新文件"
          onPress={() => void refresh(routePath)}
        >
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>
      {status === "loading" && !activeTabId ? (
        <div className="flex justify-center py-8">
          <Spinner size="sm" />
          <span className="sr-only">加载文件</span>
        </div>
      ) : null}
      {error ? (
        <div
          role="alert"
          className="rounded-large border border-danger bg-danger/10 p-3 text-sm text-danger"
        >
          {error}
        </div>
      ) : null}
      {nodes.length === 0 && status === "ready" ? (
        <EmptyState className="py-10 text-center">暂无文件</EmptyState>
      ) : null}
      <div className="space-y-2">
        {nodes.map((node) => (
          <FileNodeRow key={node.path} node={node} />
        ))}
      </div>
    </section>
  );
}

export function MobileTerminalPage() {
  const sessions = usePtyStore((s) => s.sessions);
  const activeId = usePtyStore((s) => s.activeId);
  const status = usePtyStore((s) => s.status);
  const error = usePtyStore((s) => s.error);
  const load = usePtyStore((s) => s.load);
  const create = usePtyStore((s) => s.create);
  const remove = usePtyStore((s) => s.remove);
  const select = usePtyStore((s) => s.select);

  useEffect(() => {
    if (status === "idle") void load();
  }, [load, status]);

  return (
    <section className="space-y-3" aria-label="移动终端">
      <Button
        color="primary"
        size="sm"
        startContent={<Plus className="h-4 w-4" />}
        onPress={() => void create()}
      >
        新建终端
      </Button>
      {status === "loading" ? (
        <div className="flex justify-center py-8">
          <Spinner size="sm" />
          <span className="sr-only">加载终端</span>
        </div>
      ) : null}
      {error ? (
        <div
          role="alert"
          className="rounded-large border border-danger bg-danger/10 p-3 text-sm text-danger"
        >
          {error}
        </div>
      ) : null}
      {sessions.length === 0 && status === "ready" ? (
        <EmptyState className="py-10 text-center">暂无 PTY 会话</EmptyState>
      ) : null}
      <div className="space-y-2">
        {sessions.map((session) => (
          <div
            key={session.id}
            className={cn(
              "rounded-large border bg-content1 p-3 shadow-sm",
              session.id === activeId ? "border-primary" : "border-default-200",
            )}
          >
            <button
              type="button"
              className="flex w-full items-center gap-3 text-left"
              onClick={() => select(session.id)}
            >
              <TerminalSquare className="h-5 w-5 text-primary" />
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold text-foreground">
                  {session.title || session.command}
                </div>
                <div className="text-xs text-default-500">{session.status}</div>
              </div>
            </button>
            <div className="mt-3 flex gap-2">
              <Button
                size="sm"
                variant="flat"
                onPress={() => select(session.id)}
              >
                切换
              </Button>
              <Button
                size="sm"
                variant="light"
                color="danger"
                startContent={<Trash2 className="h-4 w-4" />}
                onPress={() => void remove(session.id)}
              >
                关闭
              </Button>
            </div>
          </div>
        ))}
      </div>
      <div className="rounded-large border border-default-200 bg-content1 p-3 text-xs text-default-500">
        完整 xterm.js 输入输出和特殊键栏尚未接入；当前移动端提供已有 PTY
        lifecycle 管理能力。
      </div>
    </section>
  );
}

type MeSection = "overview" | "provider" | "permissions" | "account";

function activeMeSection(routeTail: string | undefined): MeSection {
  const section = routeTail?.split("/").filter(Boolean)[0];
  if (
    section === "provider" ||
    section === "permissions" ||
    section === "account"
  )
    return section;
  return "overview";
}

function formatTokens(tokens: number): string {
  if (tokens >= 1_000_000) return `${(tokens / 1_000_000).toFixed(1)}M`;
  if (tokens >= 1_000) return `${Math.round(tokens / 1_000)}K`;
  return String(tokens);
}

function formatModelCost(perToken: number): string {
  const perMillion = perToken * 1_000_000;
  if (!Number.isFinite(perMillion) || perMillion === 0) return "free";
  if (perMillion < 0.01) return `$${perMillion.toFixed(4)}`;
  return `$${perMillion.toFixed(2)}`;
}

function MeLinkCard({
  to,
  icon,
  title,
  description,
  meta,
}: {
  to: string;
  icon: ReactNode;
  title: string;
  description: string;
  meta?: string;
}) {
  return (
    <Link
      to={to}
      className="flex min-h-16 items-center gap-3 rounded-large border border-default-200 bg-content1 p-3 shadow-sm transition-colors hover:border-primary/40 hover:bg-content2"
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-large bg-primary/10 text-primary">
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-semibold text-foreground">{title}</div>
        <div className="truncate text-xs text-default-500">{description}</div>
      </div>
      {meta ? (
        <span className="rounded-full bg-default-100 px-2 py-0.5 text-xs text-default-600">
          {meta}
        </span>
      ) : null}
      <ChevronRight className="h-4 w-4 shrink-0 text-default-400" />
    </Link>
  );
}

function ThemeSettingsCard() {
  const mode = useThemeStore((s) => s.mode);
  const setMode = useThemeStore((s) => s.setMode);

  return (
    <div className="rounded-large border border-default-200 bg-content1 p-3">
      <div className="text-sm font-semibold text-foreground">主题</div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <Button
          variant={mode === "dark" ? "primary" : "flat"}
          startContent={<Moon className="h-4 w-4" />}
          onPress={() => setMode("dark")}
        >
          深色
        </Button>
        <Button
          variant={mode === "light" ? "primary" : "flat"}
          startContent={<Sun className="h-4 w-4" />}
          onPress={() => setMode("light")}
        >
          浅色
        </Button>
      </div>
    </div>
  );
}

function MobileMeOverview() {
  const currentModel = useModelsStore((s) => s.current());
  const permissionCount = usePermissionsStore((s) => s.totalCount());
  const online = useOnlineStatus();
  const { canInstall, install } = useInstallPrompt();

  return (
    <section className="space-y-3" aria-label="移动我的">
      <ThemeSettingsCard />
      <MeLinkCard
        to="/m/me/provider"
        icon={<Cpu className="h-5 w-5" />}
        title="模型 / Provider"
        description={
          currentModel
            ? `${currentModel.providerName} / ${currentModel.modelName}`
            : "选择默认聊天模型"
        }
      />
      <MeLinkCard
        to="/m/me/permissions"
        icon={<ShieldAlert className="h-5 w-5" />}
        title="权限中心"
        description="查看待审批工具与命令权限"
        meta={permissionCount > 0 ? String(permissionCount) : undefined}
      />
      <MeLinkCard
        to="/m/me/account"
        icon={<KeyRound className="h-5 w-5" />}
        title="账户"
        description={getCsrfToken() ? "Token 已连接" : "Token 状态未知"}
      />
      <div className="rounded-large border border-default-200 bg-content1 p-3">
        <div className="text-sm font-semibold text-foreground">连接状态</div>
        <div className="mt-2 flex items-center gap-2 text-sm text-default-600">
          <Wifi className="h-4 w-4" />
          {online ? "在线" : "离线，只读浏览缓存内容"}
        </div>
        <div className="mt-1 text-xs text-default-500">
          服务地址：{window.location.origin}
        </div>
      </div>
      <div className="rounded-large border border-default-200 bg-content1 p-3">
        <div className="text-sm font-semibold text-foreground">PWA 安装</div>
        <p className="mt-2 text-xs text-default-500">
          Android/桌面 Chrome 可使用安装按钮；iOS 请通过 Safari
          分享菜单添加到主屏幕。
        </p>
        <Button
          className="mt-3"
          size="sm"
          variant="primary"
          isDisabled={!canInstall}
          onPress={() => void install()}
        >
          安装到主屏幕
        </Button>
      </div>
    </section>
  );
}

function MobileProviderSection() {
  const status = useModelsStore((s) => s.status);
  const error = useModelsStore((s) => s.error);
  const options = useModelsStore((s) => s.options);
  const selectedProviderID = useModelsStore((s) => s.selectedProviderID);
  const selectedModelID = useModelsStore((s) => s.selectedModelID);
  const load = useModelsStore((s) => s.load);
  const select = useModelsStore((s) => s.select);

  useEffect(() => {
    if (status === "idle") void load();
  }, [load, status]);

  return (
    <section className="space-y-3" aria-label="移动模型 Provider">
      <div className="rounded-large border border-default-200 bg-content1 p-3">
        <div className="flex items-center gap-2">
          <Cpu className="h-4 w-4 text-primary" />
          <div className="text-sm font-semibold text-foreground">
            模型 / Provider
          </div>
        </div>
        <div className="mt-1 text-xs text-default-500">
          复用当前模型 store，选择会写入桌面同一偏好。
        </div>
      </div>
      {status === "loading" ? (
        <div className="flex justify-center py-8">
          <Spinner size="sm" />
        </div>
      ) : null}
      {error ? (
        <div
          role="alert"
          className="rounded-large border border-danger bg-danger/10 p-3 text-sm text-danger"
        >
          {error}
        </div>
      ) : null}
      <div className="space-y-2">
        {options.map((option) => {
          const selected =
            option.providerID === selectedProviderID &&
            option.modelID === selectedModelID;
          return (
            <button
              key={`${option.providerID}:${option.modelID}`}
              type="button"
              onClick={() => select(option.providerID, option.modelID)}
              className={cn(
                "flex w-full items-center gap-3 rounded-large border bg-content1 p-3 text-left shadow-sm",
                selected ? "border-primary" : "border-default-200",
              )}
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate text-sm font-semibold text-foreground">
                    {option.modelName}
                  </span>
                  {option.isDefault ? (
                    <span className="rounded bg-primary-500/20 px-1 text-[9px] uppercase tracking-wide text-primary-600">
                      default
                    </span>
                  ) : null}
                </div>
                <div className="truncate text-xs text-default-500">
                  {option.providerName} · ctx{" "}
                  {formatTokens(option.contextLimit)} · in{" "}
                  {formatModelCost(option.costInput)} / out{" "}
                  {formatModelCost(option.costOutput)} per 1M
                </div>
              </div>
              {selected ? (
                <CheckCircle2 className="h-5 w-5 text-primary" />
              ) : null}
            </button>
          );
        })}
      </div>
      {options.length === 0 && status === "ready" ? (
        <EmptyState className="py-10 text-center">暂无可用模型</EmptyState>
      ) : null}
    </section>
  );
}

function MobilePermissionsSection() {
  const sessions = useSessionsStore((s) => s.sessions);
  const activeId = useSessionsStore((s) => s.activeId);
  const setActive = useSessionsStore((s) => s.setActive);
  const bySession = usePermissionsStore((s) => s.bySession);
  const total = usePermissionsStore((s) => s.totalCount());
  const rows = Object.entries(bySession).filter(
    ([, permissions]) => permissions.length > 0,
  );

  return (
    <section className="space-y-3" aria-label="移动权限中心">
      <div className="rounded-large border border-default-200 bg-content1 p-3">
        <div className="flex items-center gap-2">
          <ShieldAlert className="h-4 w-4 text-primary" />
          <div className="text-sm font-semibold text-foreground">权限中心</div>
        </div>
        <div className="mt-1 text-xs text-default-500">
          共 {total} 个待审批权限；当前会话权限会继续由全局弹窗处理。
        </div>
      </div>
      {rows.length === 0 ? (
        <EmptyState className="rounded-large border border-default-200 bg-content1 py-10 text-center">
          暂无待审批权限
        </EmptyState>
      ) : null}
      <div className="space-y-2">
        {rows.map(([sessionID, permissions]) => {
          const session = sessions.find((item) => item.id === sessionID);
          return (
            <button
              key={sessionID}
              type="button"
              onClick={() => setActive(sessionID)}
              className={cn(
                "flex w-full items-center gap-3 rounded-large border bg-content1 p-3 text-left shadow-sm",
                activeId === sessionID
                  ? "border-primary"
                  : "border-default-200",
              )}
            >
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold text-foreground">
                  {session?.title || sessionID}
                </div>
                <div className="truncate text-xs text-default-500">
                  {permissions[0]?.title ?? "待审批权限"}
                </div>
              </div>
              <span className="rounded-full bg-danger/15 px-2 py-0.5 text-xs font-medium text-danger">
                {permissions.length}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

function MobileAccountSection() {
  const token = getCsrfToken();
  const online = useOnlineStatus();

  return (
    <section className="space-y-3" aria-label="移动账户">
      <div className="rounded-large border border-default-200 bg-content1 p-3">
        <div className="flex items-center gap-2">
          <KeyRound className="h-4 w-4 text-primary" />
          <div className="text-sm font-semibold text-foreground">账户信息</div>
        </div>
        <div className="mt-3 grid gap-2 text-sm">
          <div className="flex items-center justify-between gap-3">
            <span className="text-default-500">Token 状态</span>
            <Chip
              size="sm"
              color={token ? "success" : "default"}
              variant="soft"
            >
              {token ? "已连接" : "未知"}
            </Chip>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="text-default-500">服务</span>
            <span className="truncate text-foreground">
              {window.location.origin}
            </span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="text-default-500">网络</span>
            <span className="text-foreground">{online ? "在线" : "离线"}</span>
          </div>
        </div>
      </div>
      <Button
        color="danger"
        variant="danger-soft"
        startContent={<LogOut className="h-4 w-4" />}
        onPress={() => void logout()}
      >
        退出登录
      </Button>
    </section>
  );
}

export function MobileMePage() {
  const params = useParams();
  const section = activeMeSection(params["*"]);

  if (section === "provider") return <MobileProviderSection />;
  if (section === "permissions") return <MobilePermissionsSection />;
  if (section === "account") return <MobileAccountSection />;
  return <MobileMeOverview />;
}

export function NotFound() {
  return (
    <div className="flex h-full items-center justify-center p-6 text-sm text-default-500">
      <Link to="/m/chat">页面不存在，返回移动首页</Link>
    </div>
  );
}
