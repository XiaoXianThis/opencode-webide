# CheckListMobile

## 背景

目标是在现有 WebIDE 基础上全面新增移动端支持，形成 App-like 的移动体验，并支持 PWA 安装。

移动端底部导航规划为五个页面：

- 项目列表：打开/切换项目
- 聊天与会话
- 文件管理：当前项目文件
- 终端
- 我的：设置、权限、主题、PWA 等

建议第一版采用“响应式双布局”：桌面端保留现有 IDE 分栏布局，移动端新增独立 `MobileAppShell`，避免强行压缩桌面布局。

## 关键建议

- 桌面端现有布局保持不变（功能不回归）。
- 移动端新增独立 App Shell 和底部导航。
- **`BrowserRouter` 全量接管**：统一 `/`、`/login`、`/m/*`，移除自制 `pathname + popstate + webide:navigate` 路由。
- **编辑器统一用 CodeMirror 6**（桌面 + 移动同一套），桌面 `EditorPane` 一并迁移。
- PWA 目标：可安装 + 在线可用 + 静态壳缓存 + 离线打开首页（只读）。
- **Web Push / Background Sync 本迭代不做**，作为 TODO 推迟。
- **不做任何离线写**：离线只读 + 明显的“已离线”提示。
- Service Worker 使用 **`workbox-build`** 生成，纳入 `bun build` 构建流程。
- 不缓存敏感 API、SSE、PTY 请求。
- 文件管理与终端均做到完整能力档。

## 已确认决策（2026-05-13）

| 维度           | 决策                                                                                                                         |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| 设备范围       | **仅手机竖屏**，断点 `<768px` 走移动布局；平板与桌面保持现有 IDE 分栏                                                        |
| 路由           | **`BrowserRouter` 全量接管**：统一 `/`、`/login`、`/m/*`；删除现有 `pathname + popstate + webide:navigate` 自制路由          |
| 移动路由表     | `/m/projects`、`/m/chat`、`/m/chat/:sessionId`、`/m/files`、`/m/files/*path`、`/m/terminal`、`/m/terminal/:ptyId`、`/m/me/*` |
| 编辑器         | **桌面与移动统一 CodeMirror 6**；桌面 `EditorPane` 迁移至 CodeMirror 6，删除 Monaco（如存在）                                |
| 文件 Tab       | **C 档**：浏览 + 预览 + 编辑保存 + 新建/重命名/删除/移动                                                                     |
| 终端 Tab       | **C 档**：完整 xterm.js + 软键盘特殊键栏（Tab / Esc / Ctrl / 方向键），支持多会话                                            |
| 聊天 Tab       | 默认进入当前会话，**会话列表走左侧抽屉**                                                                                     |
| 项目 Tab       | 列表 + 切换 + **新增/打开本机路径**（走服务端 API）                                                                          |
| PWA 范围       | 可安装 + 在线可用 + 静态壳缓存 + **离线打开首页（只读）**                                                                    |
| PWA 推迟       | **Web Push / Background Sync 推迟到下一迭代**；本迭代仅留 TODO                                                               |
| Service Worker | 使用 **`workbox-build`** 生成 `sw.js`，纳入 `bun build` 构建流程；bypass SSE / PTY / 权限 / 鉴权类 API                       |
| 离线写         | **完全不做**；离线时只读 + 显著“已离线”提示                                                                                  |
| PWA scope      | `start_url=/m`、`scope=/`、`display=standalone`；未登录跳 `/login`，登录成功回 `/m`                                          |
| 我的 Tab       | 主题 / 模型 Provider / 权限中心 / 连接状态+服务地址+版本 / PWA 安装引导 / 退出登录+账户信息                                  |

## 阶段 1：移动端信息架构

- [x] 确认移动端目标设备范围：仅手机竖屏（<768px）
- [x] 确认五个底部 Tab 的命名：项目 / 聊天 / 文件 / 终端 / 我的
- [x] 确认桌面端现有布局保持不变
- [x] 确认使用 `BrowserRouter` 做 URL 深链接
- [x] 确认文件 Tab 做完整文件操作（C 档）
- [x] 确认终端 Tab 做完整 xterm.js 交互（C 档）
- [x] 确认 PWA 范围：可安装 + 离线首页（只读），Push / Background Sync 推迟
- [x] 确认 `BrowserRouter` 全量接管 + 删除自制路由
- [x] 确认编辑器统一 CodeMirror 6（桌面 + 移动）
- [x] 确认 Service Worker 用 `workbox-build` 生成
- [x] 确认 PWA `start_url=/m`，未登录回 `/login` 后跳 `/m`
- [x] 确认离线完全不做写入（只读 + 离线提示）
- [x] 定义路由表：`/m`、`/m/projects`、`/m/chat`、`/m/chat/:sessionId`、`/m/files`、`/m/files/*path`、`/m/terminal`、`/m/terminal/:ptyId`、`/m/me/*`
- [x] 定义五个 Tab 各自的二级页面与抽屉/模态层级
- [x] 定义桌面/移动布局切换策略（媒体查询 + Route guard，桌面命中 `/m/*` 且非移动设备时回退 `/`）

## 阶段 2：移动端 App Shell 与路由

### 路由统一接管（前置）

- [x] 安装 `react-router-dom`
- [x] 用 `BrowserRouter` 包裹 `App`，定义根 `<Routes>`：`/`（桌面）、`/login`、`/m/*`（移动）
- [x] **删除** `App.tsx` 内现有的 `pathname` state、`popstate`/`webide:navigate` 监听
- [x] 把 `Login` 改造为路由组件，登录成功后 `navigate('/m')` 或 `'/'`（按 `useIsMobile`）
- [x] 全局搜索 `webide:navigate` / `window.location.pathname` 等用法并替换为 `useNavigate` / `useLocation`
- [x] 服务端 SPA fallback：`index.ts` / `proxy.ts` 对非 `/api/*` 的 GET 全部回退 `index.html`（确保深链可用）
- [x] 路由错误边界 `<ErrorBoundary>` + `NotFound` 兜底

### 移动 App Shell

- [x] 设计路由表并新增 `MobileRoutes`，挂载在 `/m/*`
- [x] 新增 `useIsMobile()` Hook（`matchMedia('(max-width: 767px)')`，订阅变化）
- [x] 根路由根据 `useIsMobile()` 自动重定向：桌面访问 `/m/*` 跳 `/`，移动访问 `/` 跳 `/m`
- [x] 新增 `MobileAppShell`（Outlet + 顶栏 + 底部导航 + safe-area 包裹）
- [x] 新增 `MobileBottomNav`，使用 `NavLink` 高亮当前 Tab
- [x] 新增 `MobileTopBar`：当前项目名 + 二级页返回按钮 + 抽屉触发
- [x] 保留桌面 `WorkspaceCenter + ChatPanel` 布局不变
- [x] 处理 `100dvh`（fallback `100vh`）高度
- [x] 适配 iOS safe-area：`env(safe-area-inset-top/bottom)`
- [x] 处理软键盘弹出时 `visualViewport` 高度变化
- [x] 禁止主体横向溢出（`overflow-x: hidden`）
- [x] 为内容容器预留底部 Tab 高度的 padding
- [x] 增加 App Shell 单元测试（路由匹配、Tab 切换、safe-area class、移动/桌面互跳）

## 阶段 3：项目列表 Tab（`/m/projects`）

- [x] 抽取项目展示逻辑，复用 `useProjectsStore`
- [x] 新增 `MobileProjectsPage`：项目卡片列表（项目名 / 路径 / 当前态徽标）
- [x] 支持点击切换当前项目，切换后跳转 `/m/chat` 或保持当前 Tab
- [x] 切换项目后刷新文件树、会话、PTY 状态
- [ ] **新增项目**：FAB 按钮 → 弹窗输入本地路径 → 调用服务端 `POST /api/projects`
- [ ] **打开本机路径**：路径输入 + 历史路径建议 + 校验存在性
- [ ] 删除/重命名项目入口（长按或滑动操作）
- [x] 项目搜索/筛选（项目数 > 10 时显示）
- [x] 空状态、加载骨架屏、错误重试
- [x] 项目切换 + 新增的单元/集成测试

## 阶段 4：聊天与会话 Tab（`/m/chat`、`/m/chat/:sessionId`）

- [ ] 将 `ChatPanel` 拆分为 `ChatBody`（消息流 + Composer）+ `SessionList`（可复用）
- [x] 新增 `MobileChatPage`：默认渲染当前会话 `ChatBody`
- [x] **左侧抽屉**：滑动或点击顶栏图标打开 `SessionList`，点击会话 → 路由跳 `/m/chat/:id`
- [x] 抽屉支持搜索会话、新建会话、删除会话
- [x] 保留消息搜索、停止生成、总结、权限提醒入口（顶栏菜单收纳）
- [x] 移动端 Composer：自适应高度 + 软键盘弹出时滚动到底部
- [x] 处理 `visualViewport` 变化导致的输入框遮挡
- [x] 消息列表自动滚动 + 用户上滑时暂停自动滚动
- [ ] 大消息列表虚拟化（如已有则复用）
- [ ] 移动端聊天 E2E：发送 / 中断 / 切换会话 / 抽屉交互

## 阶段 5：文件管理 Tab（`/m/files`、`/m/files/*path`） — C 档

### 浏览

- [ ] 拆分 `FileTree` 数据层（hooks/store）与视图层
- [x] 新增 `MobileFilesPage`：当前目录列表 + 面包屑
- [x] 支持目录进入/返回上级（路由 `/m/files/*path` 驱动）
- [x] 文件状态徽标（git 状态、未保存等）
- [ ] 大目录虚拟化（react-virtual 或现有方案）
- [x] 下拉刷新、加载骨架、错误重试

### 编辑（CodeMirror 6 桌面/移动统一）

- [ ] 调研当前桌面 `EditorPane` 实现，确认是否依赖 Monaco（如是则一并迁移）
- [ ] 引入 `codemirror` v6 + `@codemirror/state` `@codemirror/view` `@codemirror/lang-*` `@codemirror/theme-one-dark` 等
- [ ] 新增 `<Editor>` 组件作为唯一编辑器组件，按设备读取不同 props（移动端关闭自动补全提示、缩短行号宽度）
- [ ] **迁移桌面 `EditorPane` 到 `<Editor>`**，移除旧编辑器依赖
- [x] 点击文件 → 进入文件查看/编辑视图（移动端独立页 `/m/files/*path`，桌面端 `EditorPane`）
- [ ] 语法高亮（按扩展名 lazy-load 语言扩展）、行号、只读切换
- [x] 保存按钮 + 未保存提示 + 离开确认
- [ ] 二进制/超大文件降级为预览/拒绝打开
- [ ] 共享主题：跟随 `useThemeStore`（深色/浅色）

### 文件操作（完整）

- [ ] 新建文件 / 新建目录（FAB + 表单）
- [ ] 重命名（长按菜单 / 滑动操作）
- [ ] 删除（长按菜单 + 二次确认）
- [ ] 移动（选择目标目录的选择器）
- [ ] 多选模式（长按进入，支持批量删除/移动）
- [ ] 复制路径、复制内容
- [ ] 所有操作绑定后端 API + 乐观更新 + 失败回滚

### 测试

- [ ] 文件操作单元测试 + 集成测试
- [ ] E2E：浏览、编辑保存、新建、重命名、删除、移动、多选

## 阶段 6：终端 Tab（`/m/terminal`、`/m/terminal/:ptyId`） — C 档

### 终端核心

- [ ] 拆分 `PtyPanel` 为 `PtyList` + `PtyView`
- [x] 新增 `MobileTerminalPage`：默认渲染当前 PTY，无则显示空态 + 新建按钮
- [x] 会话列表抽屉（顶栏图标触发）：列表、新建、切换、关闭
- [x] 路由切换 PTY：`/m/terminal/:ptyId`
- [ ] xterm.js 完整接入：FitAddon、WebLinksAddon、SearchAddon
- [ ] 处理 DPR 与字体大小，输出清晰
- [ ] resize：根据 `visualViewport` 与容器尺寸重算 cols/rows

### 软键盘 + 特殊键栏

- [ ] 隐藏文本输入框接收软键盘输入，转发到 PTY
- [ ] 软键盘上方浮动**特殊键栏**：`Tab` `Esc` `Ctrl` `↑` `↓` `←` `→` `Ctrl+C` `Ctrl+D` `Ctrl+Z` `/` `~` `\|`
- [ ] `Ctrl` 粘滞键：按下后下一字符与 Ctrl 组合发送
- [ ] 自定义快捷键栏（可配置）
- [ ] 长按粘贴菜单 + 系统剪贴板集成
- [ ] 选区复制（长按拖选）

### 体验

- [ ] 输出自动滚动 + 上滑暂停
- [ ] 横屏增强显示（虽然主目标竖屏，但横屏不崩）
- [ ] 多 PTY 之间状态保留（不卸载 xterm 实例，使用 display:none 切换）
- [ ] 断连/重连提示

### 测试

- [x] PTY 切换、新建、关闭单元测试
- [ ] 特殊键栏单元测试
- [ ] E2E（mock PTY 后端）

## 阶段 7：我的/设置 Tab（`/m/me`、`/m/me/:section`）

- [x] 新增 `MobileMePage`：分组列表（iOS 设置风格）
- [x] **主题切换**：深色 / 浅色
- [ ] 主题跟随系统
- [x] **模型 / Provider 选择**：列表 + 默认模型设置
- [x] **权限中心**：待审批工具/命令权限概览 + 会话定位
- [ ] 权限中心内联审批/拒绝管理
- [x] **连接状态**：服务地址 + 在线/离线状态
- [ ] 健康状态、版本号、构建时间
- [x] **PWA 安装引导**：检测 `beforeinstallprompt`；iOS 显示手动添加到主屏教程
- [x] **账户信息 + 退出登录**：Token 状态 + 退出登录
- [ ] 当前用户 + 退出确认
- [x] 二级页面均使用路由（便于返回手势/浏览器后退）
- [x] 设置项单元测试

## 阶段 8：PWA 基础能力（本迭代范围）

### Manifest 与图标

- [x] 新增 `public/manifest.webmanifest`
- [x] 配置 `name=opencode WebIDE`、`short_name=opencode`、`description`
- [x] **`start_url=/m`**、**`scope=/`**、**`display=standalone`**、`orientation=portrait`
- [x] 配置 `theme_color`、`background_color`（与深色主题对齐）
- [x] 准备 192x192、512x512、512x512 maskable 三套 icon（放在 `public/icons/`）
- [x] 在 `index.html` 引入 `<link rel="manifest">`
- [x] 添加 iOS PWA meta：`apple-mobile-web-app-capable`、`apple-mobile-web-app-status-bar-style`、`apple-mobile-web-app-title`
- [x] 添加 Apple touch icon（180x180）
- [ ] 添加 iOS 启动 splash（按主流尺寸，至少 1 张）

### Service Worker（workbox-build）

- [x] 安装 `workbox-build`（devDependency）
- [x] 新增 `scripts/build-sw.ts`：调用 `injectManifest` 或 `generateSW` 生成 `dist/public/sw.js`
- [x] `package.json` `build` 脚本串接：先 `bun build` 再 `bun scripts/build-sw.ts`
- [x] 新增 `src/client/sw/sw.ts` 源文件（injectManifest 模式）：precache app shell + 静态资源
- [x] runtime 缓存策略：`StaleWhileRevalidate` 对静态资源、`NetworkFirst` 对 HTML（含 `/m/*` 深链）
- [x] **bypass 列表**：`/api/event*`、`/api/pty*`、`/api/permission*`、`/api/auth*`、`/api/file/write*`、所有 SSE 请求（`accept: text/event-stream`）
- [x] 离线 fallback：`/offline.html` 仅显示静态壳 + “重新连接”按钮
- [x] 在 `main.tsx` 注册 SW（仅 production）
- [x] SW 升级策略：`skipWaiting` + `clientsClaim` + 顶部条提示“新版本可用，点击刷新”

### 安装与在线状态

- [x] `useInstallPrompt()` Hook 捕获 `beforeinstallprompt`（Android/桌面 Chrome）
- [x] 我的 Tab 显示安装按钮（可用时）；iOS 显示“添加到主屏幕”图文教程
- [x] `useOnlineStatus()` Hook 监听 `online`/`offline`
- [x] 顶栏出现“已离线，仅可浏览缓存内容”醒目条
- [x] **离线状态下所有写操作 UI 置灰 + 提示**

### 验收

- [ ] Lighthouse PWA 评分 ≥ 90
- [ ] manifest.webmanifest 通过 Chrome DevTools Application 面板校验
- [ ] 安装到 Android/iOS 主屏 → standalone 启动 → 首屏可见
- [ ] 断网状态下能打开首页 + 路由切换不白屏
- [ ] SSE / PTY 请求在 SW 中确认被透传，不被缓存

## 阶段 9：移动端体验细节

- [ ] 适配触摸目标尺寸，底部导航按钮不小于 44px
- [ ] 适配深色/浅色主题
- [ ] 处理移动端滚动穿透
- [ ] 处理输入框聚焦时布局跳动
- [ ] 优化列表空状态和错误状态
- [ ] 优化加载态骨架屏或 Spinner
- [ ] 增加当前项目上下文提示
- [ ] 增加权限请求在移动端的展示方式
- [ ] 确认 Toast 在底部导航上方显示
- [ ] 确认状态栏信息在移动端如何收纳

## 阶段 10：测试与验收

- [x] 增加移动端组件单元测试
- [x] 增加项目切换测试
- [x] 增加聊天 Tab 测试
- [ ] 增加文件 Tab 测试
- [x] 增加终端 Tab 测试
- [x] 增加设置 Tab 测试
- [x] 增加 PWA manifest 测试或构建校验
- [x] 使用 Playwright 跑移动端 viewport E2E
- [x] 验证 iPhone 尺寸布局
- [x] 验证 Android 手机尺寸布局
- [ ] 验证横屏布局不崩
- [ ] 验证桌面端布局无回归
- [ ] 运行 `bun test`
- [ ] 运行 `bun run typecheck`
- [ ] 运行 `bun run build`
- [ ] 手动验证 PWA 可安装
- [ ] 手动验证安装后 standalone 模式可用

## 推荐实施顺序

1. **路由统一接管**：`BrowserRouter` 全量接管，删除自制路由；服务端 SPA fallback；`Login` 转路由组件。
2. **App Shell**：`useIsMobile`、`MobileAppShell` + `MobileTopBar` + `MobileBottomNav`、safe-area / dvh / visualViewport 适配。
3. **编辑器统一**：迁移桌面 `EditorPane` 至 CodeMirror 6，抽出 `<Editor>` 共享组件。
4. **项目 Tab**：列表 + 切换 + 新增本机路径。
5. **聊天 Tab**：拆分 `ChatPanel`、当前会话 + 抽屉式会话列表。
6. **文件 Tab（C 档）**：浏览 → 编辑（`<Editor>`）→ 完整文件操作。
7. **终端 Tab（C 档）**：xterm.js + 软键盘特殊键栏 + 多会话。
8. **我的 Tab**：主题 / Provider / 权限 / 状态 / 安装引导 / 账户。
9. **PWA 基础**：manifest + 图标 + `workbox-build` SW + 离线首页 + 安装引导。
10. **测试与验收**：单元 + E2E（mobile viewport）+ Lighthouse + 真机（Android + iOS）。

## 已推迟（下一迭代）

- [ ] **Web Push**：VAPID 密钥、订阅表（服务端持久化）、`/api/push/subscribe` 与 `/api/push/send`、消息完成时触发推送
- [ ] **Background Sync**：IndexedDB 任务队列、`sync` 事件重放、幂等去重
- [ ] **离线写**：评估是否对“发送但断网”的聊天消息做有限离线写（当前结论：不做）
- [ ] **平板布局**：当前忽略，未来 768px ~ 1024px 区间的专门优化
- [ ] **横屏专门优化**：当前仅保证横屏不崩，未来再做专门体验
