# Installation and roles

Choose the job this machine needs to do. Most people are consumers and never
need a Runner.

| Role | Installs | Use it when |
| --- | --- | --- |
| `consumer` | Skill + MCP | You only want to use Agents shared by other people |
| `publisher` | Skill + MCP + persistent local Runner | You want to publish a Codex or Claude Code session from this machine |
| `runner` | Persistent server Runner | You operate an always-on execution server |

The web experience needs no installation.

## Use a shared Agent

Install the default consumer role:

```bash
npx -y Equality-Machine/agent-as-a-service
```

The installer detects Codex and Claude Code, installs the AaaS Skill and MCP
integration, and exits. It does not create Runner credentials or start a
background service.

Restart the client, then say:

```text
Use Agent agt_... and ask it to turn this idea into a three-step plan.
```

The first message creates your own Conversation. Follow-up messages continue
that Conversation without writing into the publisher's source session.

If Node.js or `npx` is not available, use the bootstrap installer:

```bash
curl -fsSL https://raw.githubusercontent.com/Equality-Machine/agent-as-a-service/main/install.sh | bash
```

The bootstrap path requires Git. When the system Node.js is older than 22, it
downloads and verifies an isolated Node.js 22 runtime.

## Publish from this machine

Install the publisher role:

```bash
npx -y Equality-Machine/agent-as-a-service publisher
```

This adds a persistent local Runner using a macOS LaunchAgent or Linux systemd
user service. The Runner makes outbound HTTPS requests only; it does not require
port forwarding or a public inbound address.

A consumer installation can also be promoted later. When you ask to publish
locally, the Skill:

1. checks `runner_status`;
2. explains the background service if it is missing;
3. asks for explicit confirmation;
4. calls `install_local_runner`;
5. continues only after the Runner is configured, installed, and running.

Looking up or using someone else's Agent never triggers this flow.

## Run on a server

The server must already have an authenticated Codex or Claude Code CLI.

```bash
npx -y Equality-Machine/agent-as-a-service runner
```

The command installs the Runner service and returns a `runnerId` and
`runnerToken`. Put the token only in an authorized publishing client or secret
manager. Never paste it into chat, logs, issues, images, or source control.

Manual enrollment and execution:

```bash
AAAS_DATA_DIR=/var/lib/aaas npm run cloud:enroll

AAAS_DATA_DIR=/var/lib/aaas \
AAAS_CLOUD_URL=https://aaas-agent-service.b4yesc4t.chatgpt.site \
  npm run cloud:runner
```

Set the returned credentials on the publishing client:

```bash
export AAAS_CLOUD_RUNNER_ID="<runner id>"
export AAAS_CLOUD_RUNNER_TOKEN="<runner token>"
```

Cloud publishing sends an AES-256-GCM authenticated encrypted source capsule to
the paired Runner. It does not make provider credentials portable; the server
must supply its own provider login, code, tools, and secrets.

## Select a client

The bootstrap installer can target one or both supported clients:

```bash
curl -fsSL https://raw.githubusercontent.com/Equality-Machine/agent-as-a-service/main/install.sh |
  bash -s -- --client codex
```

Available values are `auto`, `codex`, `claude`, `both`, and `none`. Consumer and
publisher roles require at least one client.

## Installation locations

The `npx` entry installs its stable runtime at:

```text
~/.local/share/efflora-aaas
```

The curl bootstrap defaults to:

```text
~/.local/share/aaas
```

Both paths use:

| Purpose | Default path |
| --- | --- |
| AaaS state | `~/.aaas` |
| Codex Skill | `~/.codex/skills/aaas` |
| Claude Code Skill | `~/.claude/skills/aaas` |
| macOS Runner service | `~/Library/LaunchAgents/com.efflora.aaas-runner.plist` |
| Linux Runner service | `~/.config/systemd/user/aaas-runner.service` |
| Bootstrap Node.js runtime, when needed | `~/.local/share/aaas-runtime` |

Override paths with `AAAS_INSTALL_DIR`, `AAAS_DATA_DIR`, and
`AAAS_RUNTIME_DIR`.

## Update

Run the same installation command again. The installer refreshes the stable
runtime and re-registers the MCP integration. The curl bootstrap stops if the
installation directory contains local edits instead of overwriting them.

## Common problems

### `aaas: command not found`

Use the full GitHub `npx` command shown above. `npx install` is not valid npm
syntax, and `@efflora/aaas` should not be assumed to exist in the npm registry
until a release is explicitly published there.

### Codex reports a missing native executable

Some npm-installed Codex wrappers remain on `PATH` after their platform binary
is removed. The installer probes the client before registration and, on macOS,
can use the working Codex desktop-app binary instead.

### A shared Agent is offline

Consumers do not fix this by installing a Runner. The Agent's publisher or
server Runner must return online.

### A new MCP is not visible

Restart Codex or Claude Code after installation. A shared Agent page also
contains a machine-readable HTTP fallback for the current task.

## Advanced bootstrap options

```bash
AAAS_INSTALL_DIR=/opt/aaas \
AAAS_DATA_DIR=/var/lib/aaas \
AAAS_CLOUD_URL=https://your-control-plane.example \
  bash install.sh --role runner
```

The bootstrap installer also supports `--repo`, `--ref`, `--source-dir`, and
`--no-start`.

```bash
bash install.sh --help
```
