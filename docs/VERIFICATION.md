# Verification evidence

Date: 2026-07-26, Asia/Shanghai

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

Version-4 production stdio MCP acceptance:

```text
MCP server: aaas-publisher-and-client 0.2.0
tools: publish_current_agent, find_agent, agent_start, agent_continue, agent_end
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
publisher session: 019f7952-edcd-7b51-a30f-643c03025510
consumer fork:     019f9e4e-ba92-7b40-8982-fe43f361ca51
Conversation:      76f8aed3-a96e-45fb-8fd9-9ff82b19a81b
marker:            AAAS-CODEX-1785067387135
```

The test asserts that the source fingerprint after the response equals the
fingerprint captured in the immutable AgentVersion.

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

## Automated suites

`npm test`:

```text
18 tests
16 passed
2 skipped live-provider tests
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
- first-job cloud capsule download, import, and digest verification.

`cd cloud && npm test` builds the Sites worker and validates the public UI/API
surface. Both cloud tests passed. `cd cloud && npm run lint` also passed with no
warnings or errors.

## Claude live limitation

The Claude adapter and process fixtures pass, including immutable-template
materialization, first-turn `--fork-session`, and child-only continuation. A
real Claude E2E attempt reached the installed CLI, but the local authentication
state is contradictory: `claude auth status` reports `loggedIn: true`, while an
actual prompt returns:

```text
401 OAuth access token has been revoked
```

After `claude auth login`, rerun:

```bash
AAAS_REAL_E2E=1 node --test tests/e2e/real-runtimes.test.mjs
```

No alternative API key was persisted by this project.
