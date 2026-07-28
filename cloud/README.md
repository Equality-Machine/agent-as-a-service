# AaaS control plane

`cloud/` contains the hosted control plane and web experience for AaaS.

[Open the production preview](https://aaas-agent-service.b4yesc4t.chatgpt.site)

## Responsibilities

- Maintain stable Agents and immutable Agent versions.
- Create an independent Conversation for every new use.
- Dispatch work to publisher or server Runners through short Job leases.
- Expose accurate queued, loading, starting, running, finalizing, cancelled, and
  failed states.
- Renew active leases with Runner heartbeats and recover work after a lease
  expires.
- Store public metadata, Conversations, messages, and jobs in D1.
- Store only AES-256-GCM encrypted cloud source capsules in R2.
- Serve the web, HTTP API, and Skill/MCP integration surfaces.
- Render GitHub Flavored Markdown and safe HTTP(S) or relative images.
- Make `/a/{agentId}` share links useful to people and self-describing to Codex
  and Claude Code through `application/aaas+json`.

The public API does not return publisher session paths, raw transcripts, Runner
tokens, or provider child session IDs.

## Develop

Node.js `>=22.13.0` is required.

```bash
npm ci
npm run dev
```

## Verify

```bash
npm test
npm run lint
```

`npm test` builds the Vinext worker before checking the public UI, Agent link,
Markdown, copy, and API contracts.

## Deploy

`.openai/hosting.json` binds this directory to the existing Sites project and
its D1/R2 resources. A deployment must use a saved Sites version whose archive
comes from the exact pushed source commit. Do not create a replacement project.

See [verification evidence](../docs/VERIFICATION.md) for deployed versions and
real workflow acceptance.
