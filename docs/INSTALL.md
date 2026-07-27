# AaaS 安装与角色

## 角色边界

| 角色 | Skill + MCP | Runner | 适用场景 |
| --- | --- | --- | --- |
| `consumer` | 是 | 否 | 调用别人发布的 Agent；默认角色 |
| `publisher` | 是 | 本地常驻 | 从本机 Codex / Claude Session 发布 Agent |
| `runner` | 否 | 服务器常驻 | 承载加密 Source Capsule 的远程执行 |

调用 Agent 的一方不持有发布者的 Session、Runner token 或 Provider 登录态。
网页消费者完全不需要安装。

## 一键安装

默认 consumer：

```bash
curl -fsSL https://raw.githubusercontent.com/Equality-Machine/agent-as-a-service/main/install.sh | bash
```

指定客户端：

```bash
curl -fsSL https://raw.githubusercontent.com/Equality-Machine/agent-as-a-service/main/install.sh |
  bash -s -- --client codex
```

直接安装 publisher：

```bash
curl -fsSL https://raw.githubusercontent.com/Equality-Machine/agent-as-a-service/main/install.sh |
  bash -s -- --role publisher
```

远程服务器 Runner：

```bash
curl -fsSL https://raw.githubusercontent.com/Equality-Machine/agent-as-a-service/main/install.sh |
  bash -s -- --role runner
```

服务器必须先装好并登录至少一个 Provider CLI（Codex 或 Claude Code）。安装器
不会把 Provider 凭据写入仓库或替用户完成登录。

## Consumer 按需升级

默认 consumer 包含完整的 AaaS MCP，因此不需要重新下载安装包：

1. 用户提出发布当前对话。
2. Skill 调用 `runner_status`，该操作只读。
3. 若 Runner 缺失或未运行，Skill说明会新增后台服务并请求确认。
4. 用户确认后，Skill 调用 `install_local_runner`。
5. 安装结果必须同时为 `configured: true`、`installed: true`、
   `running: true`，然后才能继续发布确认。

普通的 `find_agent`、`agent_start`、`agent_continue`、`agent_end` 流程不调用
Runner 安装工具。

## 安装位置与更新

- 项目：`~/.local/share/aaas`
- 独立 Node.js 运行时（仅系统 Node 不满足 22+ 时）：
  `~/.local/share/aaas-runtime`
- 本地状态：`~/.aaas`
- Codex Skill：`~/.codex/skills/aaas`
- Claude Skill：`~/.claude/skills/aaas`
- macOS 服务：`~/Library/LaunchAgents/com.efflora.aaas-runner.plist`
- Linux 用户服务：`~/.config/systemd/user/aaas-runner.service`

重复执行同一条安装命令会从 `main` 获取最新代码并重新注册 MCP。若安装目录
存在本地改动，安装器会停止，不会覆盖。

## 常用覆盖项

```bash
AAAS_INSTALL_DIR=/opt/aaas \
AAAS_DATA_DIR=/var/lib/aaas \
AAAS_CLOUD_URL=https://your-control-plane.example \
  bash install.sh --role runner
```

支持 `--repo`、`--ref`、`--source-dir`、`--no-start`；完整参数见：

```bash
bash install.sh --help
```
