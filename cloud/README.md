# AaaS Control Plane

`cloud/` 是 Agent as a Service 的公开控制面和网页客户端，当前生产实例：

[aaas-agent-service.b4yesc4t.chatgpt.site](https://aaas-agent-service.b4yesc4t.chatgpt.site)

## 职责

- 管理稳定的 Agent 和不可变 AgentVersion；
- 为每次使用创建独立 Conversation；
- 通过 Job / Lease 把请求分配给发布者本机或服务器 Runner；
- 展示排队、快照加载、隔离运行时启动、执行和收尾阶段，并支持用户取消；
- Runner 通过心跳续期短租约；失联任务可恢复而不会长期伪装成“执行中”；
- D1 保存元数据、Conversation 和任务状态；
- R2 只保存 cloud 模式下的 AES-256-GCM 加密 Source Capsule；
- 提供网页、HTTP API 和 MCP/Skill 所需的调用面；
- 用 GitHub Flavored Markdown 渲染消息，并安全加载 HTTP(S) 或相对路径图片；
- 为 `/a/{agentId}` 分享页提供可见配置说明、嵌入式
  `application/aaas+json` 和独立 manifest，使 Codex / Claude Code 能从一条
  链接完成发现、按需安装与调用。

控制面不会返回发布者 Session 路径、原始 transcript、Runner token 或 Provider
child session ID。

## 本地开发

```bash
npm install
npm run dev
```

Node.js 要求 `>=22.13.0`。

## 验证

```bash
npm test
npm run lint
```

`npm test` 会先构建 Vinext Worker，再验证公开 UI 和 API 契约。

## 部署

`.openai/hosting.json` 绑定现有 Sites 项目以及 D1/R2。部署必须使用已保存且与
Git commit 完全对应的 Sites version；不要重新创建项目。完整部署证据见根目录
[`docs/VERIFICATION.md`](../docs/VERIFICATION.md)。
