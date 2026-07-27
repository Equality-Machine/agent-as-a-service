# Verification evidence

Date: 2026-07-27, Asia/Shanghai

## Production deployment

```text
URL: https://aaas-agent-service.b4yesc4t.chatgpt.site
Access: public
Version: 4
Source commit: 9799251d5ad0b4a17a40531bf177fc0da45f6452
Health: HTTP 200 {"ok":true,"service":"AaaS control plane"}
Persistence: D1
Encrypted cloud capsules: R2
```

Version 4 was built, linted, pushed to the Sites source repository, saved from
that exact commit, and deployed successfully. The production page was then
opened in the Codex in-app browser, looked up the reference Agent by ID, and
exercised through two turns plus a fresh fork:

```text
same Conversation: cnv_0d0c57403c6046fc
first marker: AAAS-WEB-V4-1785067560313
continuation marker: AAAS-WEB-V4-CONTINUE-1785067583231
new Conversation: cnv_e0841258dfa449d2
new-fork marker: AAAS-WEB-V4-NEW-FORK-1785067602594
old branch messages present after New conversation: no
```

At a 390 x 844 viewport the document and hero widths were 390 px, the heading
kept horizontal writing, and `scrollWidth` remained 390 px. Current screenshots:

- `output/playwright/aaas-production-v4-desktop.png`
- `output/playwright/aaas-production-v4-mobile.png`

## Real current-Session publication

Publisher source:

```text
Codex source session: 019f950a-ec23-7c30-b11a-7e7c65699617
Publish boundary: beforeTurnId b45ee93b-177c-4ef6-90f2-edf17c1a322d
```

Local-runner production acceptance:

```text
Agent: agt_d45c9b0bdea74adf
Independent MCP start: cnv_75de2af81b5c46b4
First marker: PROD-FORK-OK
Second MCP process resumed same Conversation
Continuation marker: PROD-FORK-OK PROD-CONTINUE-OK
Production web created a different Conversation
Web marker: PROD-WEB-OK
```

Always-on local Runner acceptance:

```text
Agent: agt_14b2806758a042db
LaunchAgent: com.efflora.aaas-runner
Conversation: cnv_0898cbfc2b034bb3
Marker: DAEMON-RUNNER-OK
```

The consumer MCP processes explicitly removed `CODEX_THREAD_ID` and
`CLAUDE_SESSION_ID`, so they had only the public Agent/Conversation IDs.

Version-4 production stdio MCP acceptance（工具面现已向前兼容增加 Runner
按需安装工具）：

```text
MCP server: aaas-publisher-and-client 0.2.0
tools: runner_status, install_local_runner, publish_current_agent, find_agent,
       agent_start, agent_continue, agent_end
Conversation: cnv_3dc40e21b96d4ac2
start marker: AAAS-MCP-START-1785067442855
continue marker: AAAS-MCP-CONTINUE-1785067455394
same Conversation across both calls: yes
agent_end status: ended
```

## Encrypted cloud-runner acceptance

A separate server data directory was enrolled as a `cloud` Runner. The publisher
froze the current Session, encrypted a portable capsule, and uploaded it through
the production control plane. The server Runner had no local source mapping
before the Job.

```text
Agent: agt_ace1e6b97f894829
Mode: cloud
Conversation: cnv_7a5a74e949624979
Marker: ENCRYPTED-CLOUD-RUNNER-OK
Server imported source: yes
encryptedTransfer flag: true
AgentVersion digest after decrypt: matched
```

The acceptance runner was isolated by process and data directory on the same Mac
because no external server credentials were provided. The exercised protocol,
production D1/R2 storage, encrypted transfer, lease, import, Codex fork, and
consumer path are identical to a remote server deployment.

## Immutable-source proof

The latest real-provider test selected a quiescent Codex history, published it,
and created a distinct runtime branch:

```text
publisher session: 019f8ff3-b579-74b1-982a-ebd0db85845e
consumer fork:     019f9e56-9982-7d73-9372-c07d888065f5
Conversation:      73814102-3dca-4466-8666-83362a28d091
marker:            AAAS-CODEX-1785067903206
continuation:      AAAS-CODEX-1785067903206-CONTINUED
```

The test asserts that the continuation reused the same Conversation and
Provider child Session, and that the source fingerprint after both responses
equals the fingerprint captured in the immutable AgentVersion.

A separate production MCP isolation check hashed the reference Agent's original
publisher Session immediately before `agent_start` and again after the response
and `agent_end`:

```text
source: 019f950a-ec23-7c30-b11a-7e7c65699617
Conversation: cnv_c710a1a25b6f4e13
before: bbb3c066288ddbc93c4895f19ace06f828439fa4cf31684a7109539df808eb54
after:  bbb3c066288ddbc93c4895f19ace06f828439fa4cf31684a7109539df808eb54
unchanged: yes
```

## One-command installer acceptance

安装测试使用隔离的临时 HOME 和假的 Codex CLI，执行真实的 bootstrap / MCP
注册文件流程：

```text
consumer:
  Skill symlink: created
  MCP registration: created
  cloud-state.json: absent
  Runner service: absent

publisher --no-start:
  Skill symlink: created
  local Runner identity: created
  macOS LaunchAgent file: created
  background process started: intentionally disabled for isolated test

Linux:
  systemd user unit and enable/start command: generated and contract-tested

Runner hot enrollment:
  process starts unconfigured
  enrollment is written by another process
  same Runner process reloads identity and polls successfully
```

## Automated suites

`npm test` on 2026-07-27:

```text
26 tests
22 passed
4 skipped (2 live-provider + production Runner + post-publish installer)
0 failed
```

Coverage includes:

- Codex `thread/fork(path, beforeTurnId)` + goal clear + resume;
- Claude frozen-template materialization + `--fork-session`;
- active-turn exclusion for both providers;
- independent Conversation semantics;
- MCP publisher/client tool surface;
- Job/Lease claim and completion;
- source fingerprint preservation;
- AES-256-GCM capsule authentication;
- first-job cloud capsule download, import, and digest verification;
- consumer/publisher/runner role separation;
- macOS LaunchAgent and Linux systemd service plans;
- isolated bootstrap and MCP registration without consumer Runner creation;
- Runner enrollment reload after the daemon has already started.

The gated production Runner test was also executed separately on 2026-07-27
against `agt_14b2806758a042db`. It completed `agent_start → agent_continue →
agent_end` in one Conversation and confirmed the immutable source digest was
unchanged (1 passed, 0 failed).

`cd cloud && npm test` builds the Sites worker and validates the public UI/API
surface. Both cloud tests passed. `cd cloud && npm run lint` also passed with no
warnings or errors.

## Claude live acceptance

The Claude adapter and process fixtures pass, including immutable-template
materialization, first-turn `--fork-session`, and child-only continuation. The
local first-party authentication is stale: `claude auth status` reports
`loggedIn: true`, while an actual prompt returns:

```text
401 OAuth access token has been revoked
```

The accepted alternative was the user-authorized Alibaba Cloud Model Studio
Anthropic-compatible endpoint. Credentials were passed only to a temporary,
no-echo process environment and were not written to settings, state, logs, or
the repository. The installed Claude CLI first returned
`AAAS-BAILIAN-CLAUDE-CONNECTED`, then the real history test passed:

```text
provider: Claude Code through qwen3.7-max
publisher session: d577b1c2-5b54-4cd1-8958-bdfaf2769a3a
consumer fork:     024fcc5b-39fb-470e-9c41-95241102df99
Conversation:      e2a8cf66-b1bc-4ad2-b69b-a1bea8c02cf7
marker:            AAAS-CLAUDE-1785067925427
continuation:      AAAS-CLAUDE-1785067925427-CONTINUED
```

The second response reused the same Conversation and child Session, while the
publisher source fingerprint remained unchanged.
