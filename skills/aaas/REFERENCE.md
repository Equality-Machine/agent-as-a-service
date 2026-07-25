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

The MCP process starts the Runner after publishing, so the daemon is optional
while the publishing client remains open.

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
