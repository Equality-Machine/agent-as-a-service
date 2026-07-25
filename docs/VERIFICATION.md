# Verification evidence

Date: 2026-07-25, Asia/Shanghai

## Production deployment

```text
URL: https://aaas-agent-service.b4yesc4t.chatgpt.site
Access: public
Version: 2
Health: HTTP 200 {"ok":true,"service":"AaaS control plane"}
Persistence: D1
Encrypted cloud capsules: R2
```

The production page was opened in a real browser without ChatGPT authentication,
looked up an Agent by ID, created a Conversation, and rendered the returned
marker.

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

The real Codex fork created a distinct runtime file:

```text
publisher session: 019f950a-ec23-7c30-b11a-7e7c65699617
consumer fork:     019f997e-ed0b-7722-98e4-520785d3448c
```

The stored snapshot digest and post-conversation digest were identical:

```text
e987f82ae6212db2ed3847205b464f6d52c0d4978c1a790b4dbb36a3b72bcd03
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
surface. Both cloud tests passed.

## Claude live limitation

The Claude adapter and process fixtures pass, including immutable-template
materialization. Live Claude acceptance is currently unavailable because the
local Claude CLI returns:

```text
401 OAuth access token has been revoked
```

After `claude auth login`, rerun:

```bash
AAAS_REAL_E2E=1 node --test tests/e2e/real-runtimes.test.mjs
```

No alternative API key was persisted by this project.
