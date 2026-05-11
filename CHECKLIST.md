# 开发清单

按里程碑组织。**每个任务必须在落地的同一次提交里写好对应的单元测试**。
测试栈已就位：`bun test` + `happy-dom` + `@testing-library/react`，前置文件 `src/test/setup.ts`。

约定：
- **纯函数 / reducer / store** → `src/<path>/__tests__/<name>.test.ts`
- **React 组件** → `src/<path>/__tests__/<Component>.test.tsx`，用 RTL 渲染
- **服务端代码** → `src/server/__tests__/<name>.test.ts`，用 `Bun.serve` 临时实例 + `fetch`
- 跑 `bun test` 全部要 pass 才算完成
- 涉及 SDK 的测试用 `mock.module("@opencode-ai/sdk/client", ...)` 拦截
- 涉及 EventSource 的测试用 happy-dom 的实现 + 手动 dispatch

---

## 测试基建（已完成）

- [x] 安装 `happy-dom`、`@happy-dom/global-registrator`、`@testing-library/{react,dom,jest-dom,user-event}`
- [x] `bunfig.toml` 加 `[test] preload = ["./src/test/register-dom.ts", "./src/test/setup.ts"]`（顺序关键：先注册 happy-dom，再加载 testing-library）
- [x] `src/test/register-dom.ts` 仅负责把 happy-dom 挂到全局（必须先于 testing-library 的 import）
- [x] `src/test/setup.ts` 加载 jest-dom matchers + `IS_REACT_ACT_ENVIRONMENT = true` + afterEach cleanup
- [x] `package.json` 加 `test` / `test:watch` 脚本
- [x] 示范：`src/client/lib/__tests__/utils.test.ts`（纯函数）
- [x] 示范：`src/client/store/__tests__/messages.test.ts`（reducer）

### 已知限制

- **HeroUI 组件的集成测试在 happy-dom 下会挂起** — `Autocomplete` / `Select` 等基于 react-aria-components 的组件，Popover 展开时会轮询元素尺寸，happy-dom 的布局引擎不返回真值，`user.click` 进入死循环。当前策略：把相关 `describe` 标记为 `describe.skip` 并写清原因；对应 store 层行为用纯函数测试完整覆盖。后续可迁移到 jsdom 或等待 react-aria 修复。

---

## M2 补测（紧急，避免回归）

> M2 已实现但只覆盖了 messages reducer 与 utils。其余关键路径必须补测后再开 M3。

- [ ] **`sessions` store**：`src/client/store/__tests__/sessions.test.ts`
  - `mock.module` 替换 `@/lib/opencode`
  - 断言：`refresh()` 按 `time.updated` 降序排序；`create()` 把新会话置顶并设为 active；`remove()` 调 `oc.session.delete({ path: { id } })` 并在响应后从列表剔除；`rename()` 用 `oc.session.update` 并替换条目
  - 断言：`activeId` 在删除当前活动会话后回退到列表第一项；列表空时回退 `null`
- [ ] **events 单例**：`src/client/lib/__tests__/events.test.ts`
  - 用 happy-dom 的 EventSource，手动 `dispatchEvent('open')` / `'message'` / `'error'`
  - 断言：多次调用 `useOpencodeEvents` 只创建一个 EventSource；handler 在卸载后不再被触发；`onReconnected` 仅在第二次及之后的 open 触发；error → 退避重连
- [ ] **BFF reverse proxy**：`src/server/__tests__/proxy.test.ts`
  - 启一个 mock upstream `Bun.serve` 监听任意端口，注入到 `OPENCODE_URL`，再启 BFF 的 `proxyApi`
  - 断言：URL 重写（`/api/foo?x=1` → upstream `/foo?x=1`）；Basic Auth header 注入；上游返回的 JSON 原样回传；上游 502 时 BFF 返回 `502 + json`
- [ ] **BFF SSE pass-through**：`src/server/__tests__/events.test.ts`
  - mock upstream 返回 `text/event-stream` 流，逐块写入
  - 断言：`Content-Type: text/event-stream`；客户端能读到 chunk；req.signal abort 时 upstream 也被取消（用 spy AbortController）
- [x] **`Composer`**：`src/client/components/chat/__tests__/Composer.test.tsx`
  - mock messages store 的 `sendPrompt` / `abort`，mock models store 以提供 selected model
  - 6 项断言：Enter 触发 send 并带上 model、Shift+Enter 换行、空字符串不发送、按钮 disabled/enabled 切换、未选 model 时传 undefined fallback、streaming 切到 abort 按钮
- [ ] **`MessageList`**：`src/client/components/chat/__tests__/MessageList.test.tsx`
  - 准备 fixture session data
  - 断言：按 `messageOrder` 渲染；空状态文案；error 状态展示；scroll 到底时新消息追加自动滚动，未到底时不滚

---

## M3 工具调用渲染（per-tool 视图）

> 目标：替代当前的 `ToolPartView` 通用卡片，每个内置 tool 一个专门组件，含可折叠 header、diff、终端样式、错误样式。

### 公共
- [x] 抽出 `<ToolCard>` 容器（status icon、title、折叠、duration、tone）
- [x] `getToolView(toolName)` 路由表 + 默认回退（`tools/router.tsx`）
- [x] **测试** `tools/__tests__/router.test.tsx`（15 项）+ `tools/__tests__/ToolCard.test.tsx`（12 项，含 `formatDuration` / `getDuration`）

### Markdown 渲染（text part 升级）
- [x] 装 `react-markdown` + `remark-gfm`（shiki 因 WASM 体积重，留 TODO 后补）
- [x] `MarkdownView`：流式安全渲染（`memo` 化；安全 URL 拦截；HTML 默认转义）；`TextPartView` 已切到该实现
- [x] **测试** `chat/__tests__/MarkdownView.test.tsx`（9 项）：粗体/列表/代码块语言标签/链接 rel/XSS/GFM 表格

### per-tool 组件（每个一组测试 fixture）
- [x] `BashTool`：命令、stdout/stderr、退出码 chip（4 项测试）
- [x] `EditTool`：file basename + 行级 LCS diff（5 项测试，含 `tools/diff.ts` 7 项纯函数测试）
- [x] `ReadTool`：默认 5 行折叠 + 展开按钮 + 偏移行号（4 项测试）
- [x] `WriteTool`：`metadata.created` 区分 created / overwritten badge（3 项测试）
- [x] `GrepTool`：按文件分组、`<mark>` 高亮、匹配/文件数（4 项测试，含正则容错）
- [x] `GlobTool`：路径列表 + 数量 chip + 空状态（2 项测试）
- [x] `WebFetchTool`：仅 http(s) 链接渲染为 `<a>`，否则纯文本（2 项测试，rel=noopener noreferrer nofollow）
- [x] `WebSearchTool`：query + 输出摘要（1 项测试）
- [x] `TodoTool`：监听 `todo.updated`（`store/todos.ts`，5 项 store 测试），按 status 分组 + 计数（3 项组件测试）
- [x] `TaskTool`（subtask）→ `parts/SubtaskPartView.tsx`：agent chip + 折叠 prompt（3 项测试）
- [x] `GenericTool`：未知工具回退（2 项测试）
- [ ] `LspDiagnosticsTool`（如有）— 暂未实现，等 opencode 暴露相应 metadata

### 验收测试
- [x] **快照** `chat/__tests__/PartRenderer.snapshot.test.tsx`：16 个 fixture（含 text/reasoning/file/subtask/step-finish + 11 种 tool 状态）走结构化 summarise，避免 Tailwind class 噪声

### 落地变更
- 删除 `parts/ToolPartView.tsx`，`PartRenderer.tsx` 的 `tool` 分支改走 `ToolPartRouter`，`subtask` 改路由到 `SubtaskPartView`
- `app.tsx` 在 `onEvent` 里同时把事件转发给 `useTodosStore.applyEvent`（`todo.updated` 用）
- 新增 store：`store/todos.ts`（`bySession` 快照映射）

> 测试统计：M3 落地后 `bun test` = 130 pass / 6 skip（ModelPicker 历史 skip）/ 0 fail / 16 snapshots，共 22 个测试文件。

---

## M4 HITL 权限审批

- [x] **store** `src/client/store/permissions.ts`
  - state: `Record<sessionID, Permission[]>` 队列 + `pending: Record<id, true>` 用于乐观 UI；`reply(perm, response)` 调 `oc.postSessionIdPermissionsPermissionId`（SDK 顶层方法，body `{ response: "once"|"always"|"reject" }`）
  - 失败时把请求重新塞回队首便于重试；`head(sessionID)` / `totalCount()` / `clear()` 选择器
  - **测试** `store/__tests__/permissions.test.ts`（12 项）：入队 / 同 id 去重替换 / 多个排队 / replied 出队 / 未知 session 不崩 / reply 调上游 + 乐观去队 / 三种 response / 失败重新入队首 / 选择器
- [x] **applyEvent 路由**：`app.tsx` 把 `permission.*` 事件转发给 permissions store；messages store 暂不主动改 part 状态（opencode 服务端会 emit 权威 `message.part.updated`，避免客户端写入抖动）
- [x] **PermissionDialog 组件** `src/client/components/permissions/PermissionDialog.tsx`
  - 用纯 fixed overlay（不走 HeroUI Modal，避开 react-aria Modal 在 happy-dom 下的 sizing 卡顿）；`role="dialog" aria-modal`；显示 title / type+callID / metadata 列表
  - 三按钮：拒绝 / 允许一次 / 始终允许；ESC 全局监听 → reject；`isReplying` 时禁用全部按钮
  - **测试** `permissions/__tests__/PermissionDialog.test.tsx`（9 项）：title+metadata 渲染 / 排队 chip / 三按钮分别带正确参数调 onReply / ESC=reject / 进行中禁用 / 空 metadata 不渲染区块
- [x] **PermissionCenter 容器** `src/client/components/permissions/PermissionCenter.tsx`
  - 订阅 active session 的队首；选择器只取桶引用以避开 zustand 引用相等问题；`busyId` 进度
  - 跨 session 隔离（其他会话的 permission 不打扰当前 UI）
  - **测试** `permissions/__tests__/PermissionCenter.test.tsx`（4 项）：空队列不渲染 / 跨 session 不显示 / 队列上浮 + SDK 调用断言 / 队列清空后关闭
- [x] **集成**：`ChatPanel` 顶部 `ShieldAlert` 计数 chip（`data-testid="chat-permission-indicator"`），按 active session 过滤；`App` 根级挂载 `<PermissionCenter />`

> 测试统计：M4 落地后 `bun test` = 155 pass / 6 skip / 0 fail / 16 snapshots，共 25 个测试文件（permissions store + dialog + center 共新增 25 项）。

---

## M5 会话管理

- [ ] `fork({ messageID? })` + UI 入口（消息上的"分叉"图标）
  - **测试**：sessions store 调 `oc.session.fork`；返回的新会话被 setActive
- [ ] `revert({ messageID, partID? })` / `unrevert()`
  - **测试**：reducer 拿到 `session.updated` 含 `revert` 字段时把后续消息标灰
  - **UI 测试**：被 revert 的消息渲染为半透明 + 按钮恢复
- [ ] `share` / `unshare` + URL 复制按钮
  - **测试**：调用对应 API 并把返回 URL 写入 clipboard（mock `navigator.clipboard.writeText`）
- [ ] `summarize({ providerID, modelID })`
  - **测试**：触发后 sessions list 标题更新（来自 `session.updated`）
- [ ] 标题就地编辑（双击 → input → blur 保存）
  - **测试**：`SessionSidebar.test.tsx` 双击进入编辑、Enter/Esc 行为
- [ ] 父子会话树视图（`/session/:id/children`）
  - **测试**：sessions store 记录 children 关系；UI 缩进
- [ ] 会话搜索（前端按 title 模糊过滤）
  - **测试**：debounce + 大小写不敏感

---

## M6 IDE 化（编辑器与文件）

### 文件树
- [ ] `files` store：`Record<path, FileNode[]>` + 展开状态；按需 lazy load
  - **测试** `files.test.ts`：`expand(path)` 调 `oc.file.list({ query: { path } })` 并写入；`refresh(path)` 重新拉取
- [ ] `FileTree` 组件 + `FileTreeItem`
  - **测试** `FileTree.test.tsx`：点击目录展开；点文件触发 `openFile`；virtualization（大目录时）
- [ ] `FileStatusBadge` 用 `/file/status` 数据染色
  - **测试**：modified/staged/untracked 三态图标

### 编辑器
- [ ] 选 Monaco（默认）或 CodeMirror 6（轻量）— 之前定 Monaco
- [ ] `workspace` store：`tabs: Tab[]`、`activeTabId`、`buffers: Record<path, string>`、`dirty: Set<path>`
  - **测试** `workspace.test.ts`：openFile、closeTab、switchTab、edit 标记 dirty、save 后清 dirty
- [ ] `EditorPane` 包 Monaco；`@monaco-editor/react`
  - **测试** `EditorPane.test.tsx`：渲染 fallback（不 mount Monaco，因为 worker 在测试环境复杂）只测 props 传递与 ErrorBoundary
- [ ] `EditorTabs` + 关闭按钮 + dirty 圆点
  - **测试**：tabs 同步 store；关闭 dirty tab 时 confirm
- [ ] 保存：暂时不写回文件系统（opencode 没暴露 write 端点；如果要写需走 `prompt_async + edit` 工具或 PTY）— 标 `// TODO: writeback`
  - 或者：M6 只读模式，写回留 M6.1
- [ ] `file.watcher.updated` 事件 → 自动 reload
  - **测试**：events store 收到 watcher 事件后 buffers 刷新（除非 dirty）

### 命令面板
- [ ] `Cmd+P` 打开 `CommandPalette`
  - tabs: 文件 / 文本 / 符号 — 分别用 `find.files` / `find.text` / `find.symbols`
  - **测试** `CommandPalette.test.tsx`：键盘上下 + Enter 跳转；查询 debounce；空结果文案；fuzzy 高亮

### VCS
- [ ] `vcs.branch.updated` 事件展示当前分支于状态条
  - **测试**：连续 dispatch 几条事件后 StatusBar 显示最新

---

## M7 Agent / 模型切换

- [x] **`models` store**：`src/client/store/models.ts` + `src/client/store/__tests__/models.test.ts`
  - 拉取 `oc.config.providers()`，扁平化成 `ModelOption[]`，按 isDefault / providerName / modelName 排序
  - `localStorage` 持久化选中项；重启后优先恢复，失效时回退 opencode default → 第一个选项
  - 8 项断言全绿：default 排序、load 成功、持久化恢复、回退、error 态、select 持久化、非法 key 忽略、current()
- [x] **`ModelPicker` 组件**：`src/client/components/chat/ModelPicker.tsx`（HeroUI `Autocomplete` + `ListBox.Section` + `SearchField`）
  - 显示 模型名 + provider 名 + ctx/cost 元信息；default / deprecated 用 Chip 标注
  - 集成测试 `describe.skip` 中（happy-dom 与 react-aria Popover 兼容问题，见"已知限制"）
- [x] **`Composer` 注入 model**：发送时携带 `{ providerID, modelID }` 到 `sendPrompt`；未选中则省略（用 opencode 的 default）
- [ ] `AgentPicker` 下拉（拉 `oc.agent.list()`）
  - **测试** `AgentPicker.test.tsx`：搜索过滤、选中后 store 更新、空状态
- [ ] 当前消息显示其使用的 agent + model（已部分有 `info.providerID/modelID`）
- [ ] 模型 fallback：选中失效时 toast 提示

---

## M8 BFF 鉴权与远程部署

- [ ] BFF `WEBIDE_TOKEN` 环境变量；未配置则关闭鉴权（开发态）
- [ ] `/api/auth/login` 接收 token，set httpOnly cookie；`/api/auth/logout` 清 cookie
- [ ] 中间件：所有 `/api/*` 与 `/api/events` 校验 cookie
  - **测试** `auth.test.ts`：未带 cookie → 401；带正确 cookie → 透传；登入后 cookie 写入响应
- [ ] 前端登录页（独立路由）+ 401 拦截重定向
  - **测试** `Login.test.tsx`：错误密码报错；成功后跳回原路径
- [ ] CSRF：cookie sameSite=strict + double-submit token 给写操作
  - **测试**：DELETE 不带 token 被拒
- [ ] 生产构建脚本：`bun build src/client/index.html --outdir dist/public --minify`
- [ ] 生产入口：`bun index.ts` 直接服务 `dist/public`
- [ ] `Dockerfile`：Bun 1.3 base，多阶段构建
- [ ] `OPENCODE_URL` 支持远程地址（不只 127.0.0.1）

---

## 增强项（按需）

- [ ] 暗色 / 亮色主题切换 — `theme` store + Tailwind class toggle；测试持久化
- [ ] xterm 内嵌终端，使用 `/pty` 端点 — `PtyPanel` 组件 + `pty.created/updated/exited` 事件；测试基本 IO
- [ ] 多项目切换 `/project` — projects store；测试列表与切换
- [ ] LSP 状态指示 — `/lsp` 拉取 + `lsp.updated` 事件；测试三态徽章
- [ ] Toast 系统接收 `tui.toast.show` 事件 — `useToast` hook；测试自动消失
- [ ] 消息搜索（在当前会话内 grep）
- [ ] 重发/编辑用户消息（fork + 改写）
- [ ] 拖拽文件到 Composer 作为 `FilePartInput`
- [ ] 快捷键全局注册（Cmd+K 命令面板、Cmd+Enter 发送等）

---

## 工程化（任意时机）

- [ ] CI：GitHub Actions 跑 `bun install && bun test`
- [ ] 静态检查：`tsc --noEmit` + ESLint（可选）
- [ ] Pre-commit：`lint-staged` 跑 prettier + 影响范围测试
- [ ] 测试覆盖率：`bun test --coverage` 加阈值
- [ ] Storybook 或 Ladle（per-tool 渲染快速预览）
- [ ] E2E：Playwright 跑 M2 完整发消息→收事件流程

---

## 当前状态

- ✅ M1 三栏骨架 + 会话列表
- ✅ M2 SSE 流式聊天 + abort + 重连回填
- ✅ 模型选择（M7 的前置：store + HeroUI ModelPicker + Composer 注入，单测 14 项，集成测试 skip）
- ✅ UI 组件库迁移至 **HeroUI v3**（`@import "@heroui/styles"`，所有已实现组件改用 HeroUI primitives）
- ✅ M3 per-tool 视图 + Markdown 渲染（130 pass / 6 skip / 0 fail，16 快照）
- ✅ M4 HITL 权限审批（store + dialog + center + ChatPanel 红点；155 pass / 6 skip / 0 fail）
- 🟡 M2 补测进行中（reducer + utils + Composer + models 已覆盖，其余待补）
- ⬜ M5 起所有里程碑

## UI 组件库约定（HeroUI）

- 新组件**先查 HeroUI 是否已有**（Autocomplete / Listbox / Button / Tooltip / Chip / Disclosure / Card / Modal / Drawer / Tabs / TextArea / SearchField / Spinner / Avatar / Divider / EmptyState / ScrollShadow / Code / Kbd），直接组合使用
- 确实没有再写自定义组件，仍使用 HeroUI 的 Tailwind token（`bg-content1` / `text-foreground` / `text-default-500` / `border-default-200` / `text-primary` / `text-danger` / `text-success` / `text-warning` / `rounded-medium` 等），避免硬编码颜色
- 客户端默认暗色主题（由 `<html class="dark">` + HeroUI 默认主题驱动）
- 测试断言用 `getByRole("button", { name })` / `toHaveAttribute("data-disabled", "true")`，而非 `getByTitle` 或 `toBeDisabled()`（react-aria-components 用 `data-disabled`）
