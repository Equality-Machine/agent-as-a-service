# Agent as a Service

把当前 Codex / Claude Code 对话发布成一个可分享的 Agent。发布者保留私有、
不可变的 Source Session；每位调用者都创建自己的 Conversation Fork。

生产控制面：
[aaas-agent-service.b4yesc4t.chatgpt.site](https://aaas-agent-service.b4yesc4t.chatgpt.site)

## 最短使用路径

### 1. 安装到 Codex / Claude Code

```bash
npm run install:clients -- \
  --cloud-url https://aaas-agent-service.b4yesc4t.chatgpt.site \
  --client both
```

重启客户端。然后在自己的对话里直接说：

```text
把当前对话发布成 Agent，名字叫「研究助手」，在我的本地运行。
```

Skill 会展示公开名称、描述、Provider 和运行模式，请你确认后调用
`publish_current_agent`，最后返回：

```text
Agent ID: agt_...
Web URL: https://.../?agent=agt_...
```

Codex 发布时使用 `CODEX_THREAD_ID` 精确定位当前任务；Claude Code 会选择当前
项目的 Session。若无法唯一定位，Skill 必须让用户明确提供 Session ID，不会
静默发布另一条对话。

Claude Runner 可以使用现有 Claude 登录，也可以通过兼容 Anthropic Messages
协议的模型服务运行。以百炼按量模式为例，应由进程 Secret 注入以下变量，不要
把 Key 写入仓库、镜像或 Skill：

```bash
export ANTHROPIC_BASE_URL=https://dashscope.aliyuncs.com/apps/anthropic
export ANTHROPIC_AUTH_TOKEN="$DASHSCOPE_API_KEY"
export ANTHROPIC_MODEL=qwen3.7-max
```

本项目已用临时环境完成真实 Claude 历史的 Fork、Continuation 和来源摘要不变
验收；详见验证文档。

### 2. 让另一位用户调用

另一位用户安装同一个 Skill/MCP 后，在自己的 Codex 或 Claude Code 里说：

```text
使用 Agent agt_...，问它：请解释这个方案的核心隔离模型。
```

第一轮调用 `agent_start`，返回新的 `conversationId`；后续问题调用
`agent_continue` 并复用该 ID。明确结束后调用 `agent_end`。新的使用者或“新建
对话”一定再次调用 `agent_start`，因此不会复用别人的分支。

也可以直接把 Agent ID 粘贴到
[生产网页](https://aaas-agent-service.b4yesc4t.chatgpt.site)。

### 3. 让本地 Agent 常驻在线

MCP 进程在发布后会启动 Runner；若希望关闭 Codex / Claude 后仍可被调用，在
macOS 安装 LaunchAgent：

```bash
npm run install:runner -- \
  --cloud-url https://aaas-agent-service.b4yesc4t.chatgpt.site
```

本机已验证的示例：

```text
Agent ID: agt_14b2806758a042db
Runner: com.efflora.aaas-runner
```

## 两种执行模式

### `local`

- 云端只保存 Agent 元数据、Conversation、消息、Job/Lease 和 opaque
  `sourceHandle`。
- Source Snapshot、本地文件、Provider 登录态都留在发布者机器。
- Runner 只建立出站 HTTPS 连接，不需要路由器端口映射或公网入站端口。
- 发布者机器离线时，Agent 暂时不可用。

### `cloud`

- 先在服务器安装 Provider CLI、登录态和本项目，再一次性创建 Runner：

```bash
AAAS_DATA_DIR=/var/lib/aaas npm run cloud:enroll
AAAS_DATA_DIR=/var/lib/aaas \
AAAS_CLOUD_URL=https://aaas-agent-service.b4yesc4t.chatgpt.site \
  npm run cloud:runner
```

- 将输出的 `runnerId` 和 `runnerToken` 安全配置到发布端的
  `AAAS_CLOUD_RUNNER_ID` / `AAAS_CLOUD_RUNNER_TOKEN`。
- 用户确认 `cloud` 模式后，发布端冻结 Session、压缩并用 AES-256-GCM 加密
  Source Capsule。控制面把密文放入 R2；目标 Runner 首次领 Job 时下载、验证
  GCM 标签和 AgentVersion 摘要，再在服务器创建 Provider 原生 Fork。
- Runner token 经 TLS 发送并只以 SHA-256 摘要持久化；当前安全模型信任控制面
  运行时。若需要控制面对 Capsule 零信任，应升级为 Runner 公钥包裹数据密钥。

Docker 入口默认运行 cloud Runner：

```bash
docker build -t aaas-runner .
docker run --rm -v aaas-data:/data \
  aaas-runner node src/enroll-runner-cli.mjs --data-dir /data

docker run -d --name aaas-runner --restart unless-stopped \
  -e AAAS_CLOUD_URL=https://aaas-agent-service.b4yesc4t.chatgpt.site \
  -v aaas-data:/data \
  -v /srv/agent-workspace:/workspace \
  aaas-runner
```

把 Provider 凭据放入服务器的 Secret 管理器或只读挂载，不要烘焙进镜像。

## 对象模型

```text
Source Session (private, mutable publisher history)
  -> Agent
       -> AgentVersion (immutable publication boundary)
            -> Conversation A -> provider fork A -> turn 1 -> turn 2
            -> Conversation B -> provider fork B -> turn 1
```

- `Agent` 是可分享身份；不等于 Session。
- `AgentVersion` 是某次发布的冻结能力快照。
- `Conversation` 是某位调用者的一次连续使用。
- Provider 的 child session ID 永不返回给消费者。
- Codex Fork 后会清掉复制来的 active Goal，避免自动继续执行发布者任务。

## MCP 工具

- `publish_current_agent`
- `find_agent`
- `agent_start`
- `agent_continue`
- `agent_end`

Skill 位于 [`skills/aaas/SKILL.md`](skills/aaas/SKILL.md)，同一份安装到
`~/.codex/skills/aaas` 和 `~/.claude/skills/aaas`。

## 验证

```bash
npm test
cd cloud && npm test
```

自动测试覆盖 Codex / Claude Fork 合约、当前 Turn 发布边界、不可变摘要、独立
Conversation、MCP 生命周期、Job/Lease、本地 Runner、加密 Cloud Capsule 和
服务器首次导入。真实生产 E2E 证据见
[`docs/VERIFICATION.md`](docs/VERIFICATION.md)。

## 安全边界

- Session 路径和原始 transcript 不进入 D1。
- Snapshot、runner state 和 token 文件使用 `0600`。
- 默认 Codex 是 read-only + no-network；Claude 默认只允许
  `Read,Grep,Glob`。
- 文件写入、浏览器、邮件、数据库等副作用尚未按 Conversation 自动隔离；若
  开放这些工具，必须为每个 Conversation 增加 worktree/container、独立凭据
  与审批策略。
- 公共控制面当前没有账号、配额、计费或反滥用层，适合功能验收，不适合直接
  承载不受信任的大规模流量。
