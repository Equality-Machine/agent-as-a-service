# Development

## Requirements

- Node.js 22 or newer
- npm
- Git
- Optional: Codex or Claude Code for gated real-runtime tests

```bash
git clone https://github.com/Equality-Machine/agent-as-a-service.git
cd agent-as-a-service
npm ci
npm --prefix cloud ci
```

## Repository map

```text
.
├── src/                  local service, publisher, Runner, runtime, and MCP
├── cloud/                hosted control plane and web application
├── skills/aaas/          installable Codex and Claude Code Skill
├── scripts/              package entry and installation helpers
├── tests/                root unit, contract, distribution, and gated E2E
├── docs/                 product, operator, development, and evidence docs
└── .github/              CI, issue forms, PR template, and dependency updates
```

The root package has no runtime npm dependencies. The hosted control plane has
its own package and lockfile in `cloud/`.

## Local commands

```bash
npm test
npm run docs:check
npm run package:check
npm run check
```

`npm run check` runs root tests, documentation checks, package inspection, and
the cloud build/test/lint sequence.

Run the local prototype:

```bash
npm run dev
```

Run the cloud web application:

```bash
npm --prefix cloud run dev
```

## Test layers

### Default suite

`npm test` uses Node's built-in test runner. It covers publisher boundaries,
Codex and Claude fork contracts, independent conversations, MCP tools, Runner
leases, capsule encryption, installer roles, and public package execution.

Default tests use temporary directories and fakes. They must not read or mutate
a developer's real provider history.

### Cloud suite

```bash
npm --prefix cloud test
npm --prefix cloud run lint
```

The cloud suite builds the Sites worker and checks the public UI/API surface,
share manifests, Markdown rendering, and bilingual copy.

### Gated acceptance

```bash
npm run test:e2e
```

Gated tests require explicit environment variables and authorized sessions or
production resources. They may consume provider quota or create remote jobs.
Review each test file before enabling it and never point it at a session that is
still changing.

## Safe fixtures

- Use synthetic IDs, messages, source snapshots, and credentials.
- Never copy a real Codex or Claude session into the repository.
- Never include a provider token, Runner token, local home path, or transcript
  in snapshots or failure output.
- Test source immutability with digests before and after the consumer lifecycle.
- Test a full lifecycle when changing fork behavior:
  `publish → start → continue → end`.

## Runtime changes

Provider runtimes are in `src/runtimes/`. A runtime change should prove:

1. the publish boundary excludes an active incomplete turn;
2. a new Conversation creates a distinct provider child;
3. continuation resumes the same child;
4. the publisher source digest remains unchanged;
5. cancellation stops the child process;
6. isolated configuration does not recursively load AaaS.

## Database and control-plane changes

Schema changes live in `cloud/db/` and `cloud/drizzle/`. Commit generated
migrations and snapshots together. Job-state changes must consider conditional
claims, lease expiry, heartbeat renewal, idempotency, cancellation, and stale
Runner results.

## Pull requests

Follow [CONTRIBUTING.md](../CONTRIBUTING.md), keep the diff focused, and report
the exact commands run. Documentation claims about security, isolation, or
production state require matching implementation or evidence.
