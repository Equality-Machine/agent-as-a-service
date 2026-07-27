# AaaS reference

## Object model

- Source Session: private publisher-owned Codex or Claude Code history.
- Agent: stable public identity represented by `agt_...`.
- AgentVersion: immutable publication boundary represented by `ver_...`.
- Conversation: one consumer-owned branch represented by `cnv_...`.
- Job/Lease: cloud relay work item. Only the assigned Runner can claim it.
- Runner: executes on the publisher machine (`local`) or on a server (`cloud`).

The cloud control plane stores public metadata, IDs, messages, job state, and
opaque source handles. Local source paths, source transcripts, and runner
credentials stay on the Runner machine.

## One-command installation

Consumer (default, Skill + MCP only, no Runner):

```bash
npx -y Equality-Machine/agent-as-a-service
```

Publisher (Skill + MCP + persistent local Runner):

```bash
npx -y Equality-Machine/agent-as-a-service publisher
```

Server Runner:

```bash
npx -y Equality-Machine/agent-as-a-service runner
```

A consumer can be promoted on demand. Before a local publication, call
`runner_status`; after explicit user confirmation, call `install_local_runner`.
Only publishers and dedicated execution hosts need a Runner.

## Self-describing Agent links

The canonical share URL is `https://YOUR-SITE.example/a/agt_...`. A Codex or
Claude Code user can paste the whole URL into a task. The page contains visible
setup instructions, an `application/aaas+json` script block, and an alternate
manifest at `/api/v1/agents/{agentId}/manifest`.

When handling that link:

1. Check for `find_agent`, `agent_start`, `agent_continue`, and `agent_end`.
2. If unavailable, ask before running the consumer installation command above.
3. Never install a Runner just to consume the Agent.
4. After the client restarts, use the MCP flow. If the new MCP is not visible
   in the current task, follow the manifest's HTTP fallback immediately.
5. Preserve the returned `conversationId` across follow-up turns and call
   `agent_end` when finished.

## Manual installation

Set `AAAS_CLOUD_URL` to the deployed control-plane URL.

Codex:

```bash
codex mcp add aaas \
  --env AAAS_CLOUD_URL=https://YOUR-SITE.example \
  -- node /ABSOLUTE/PATH/TO/AaaS/src/aaas-mcp-stdio.mjs
```

Claude Code:

```bash
claude mcp add --scope user aaas \
  -e AAAS_CLOUD_URL=https://YOUR-SITE.example \
  -- node /ABSOLUTE/PATH/TO/AaaS/src/aaas-mcp-stdio.mjs
```

For an always-on local Runner:

```bash
AAAS_CLOUD_URL=https://YOUR-SITE.example \
  node /ABSOLUTE/PATH/TO/AaaS/src/cloud-runner-cli.mjs
```

Publishing only freezes and registers the AgentVersion. The publisher MCP never
consumes Jobs and never starts a temporary Runner. A persistent LaunchAgent,
systemd service, container, or manually supervised Runner must be running for a
published Agent to remain available after the client exits.

## Cloud Runner pairing

On the server:

```bash
AAAS_DATA_DIR=/var/lib/aaas npm run cloud:enroll
AAAS_DATA_DIR=/var/lib/aaas \
AAAS_CLOUD_URL=https://YOUR-SITE.example npm run cloud:runner
```

Configure the returned ID and secret on the publishing client as
`AAAS_CLOUD_RUNNER_ID` and `AAAS_CLOUD_RUNNER_TOKEN`. The first cloud-mode
publication uploads only an AES-256-GCM encrypted capsule; the paired server
downloads and verifies it before forking.
