# opencode-webide

基于 Bun + React 的 OpenCode Web IDE，作为 BFF 反代到本地 `opencode serve`。

## 准备

1. 启动 opencode 服务（建议加密码）：
   ```bash
   set OPENCODE_SERVER_PASSWORD=your-password
   opencode serve --hostname 127.0.0.1 --port 4096
   ```
2. 配置 BFF：
   ```bash
   copy .env.example .env
   ```
   在 `.env` 中填入 `OPENCODE_PASSWORD`。

## 安装

```bash
bun install
```

## 运行

```bash
bun run dev
```

打开 http://127.0.0.1:3000

## 架构

- `index.ts` — Bun.serve 入口，托管前端 + `/api/*` 反代 + `/api/events` SSE 透传
- `src/server/*` — 反代、SSE、env
- `src/client/*` — React 19 + Tailwind v4 + zustand
- 浏览器通过 `@opencode-ai/sdk` 经由 `/api` 调 opencode；密码仅留服务端

## 测试

```bash
bun test
```

测试栈：`bun:test` + `happy-dom` + `@testing-library/react`，前置 `src/test/setup.ts`。

## 里程碑

- [x] **M1** 三栏骨架 + 会话列表 + 连接状态
- [x] **M2** SSE 流式聊天 + prompt_async + abort + 重连回填
- [ ] **M3** 工具调用渲染（per-tool 视图、diff、折叠）
- [ ] **M4** HITL 权限审批
- [ ] **M5** 会话管理（fork/revert/share/summarize）
- [ ] **M6** 文件树 + Monaco 编辑器 + 命令面板
- [ ] **M7** Agent / 模型切换
- [ ] **M8** BFF 鉴权与远程部署

详细任务与配对单元测试见 [`CHECKLIST.md`](./CHECKLIST.md)。
