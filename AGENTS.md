# Contributor guide for coding agents

This file gives coding agents the repository-specific context needed to make
safe, reviewable changes. Human contributors should also read
[CONTRIBUTING.md](CONTRIBUTING.md).

## Product contracts

Preserve these boundaries:

1. Consumers use shared Agents without installing a Runner.
2. Local publishing may install a persistent Runner only after explicit user
   confirmation.
3. Source Session, Agent, AgentVersion, and Conversation are different objects.
4. Every `agent_start` creates a new consumer-owned provider branch.
5. `agent_continue` resumes only that Conversation's child session.
6. Public interfaces never expose source paths, raw transcripts, credentials,
   Runner tokens, or provider child IDs.
7. Isolation and security claims require implementation and acceptance evidence.

Read [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) before changing publishing,
Runner, runtime, capsule, lease, cancellation, or data-model behavior.

## Repository map

- `src/`: local service, publisher, Runner, runtimes, MCP, and storage
- `cloud/`: hosted control plane and web application
- `skills/aaas/`: installable Codex and Claude Code Skill
- `scripts/`: installation and repository utilities
- `tests/`: root tests and gated real-runtime acceptance
- `docs/`: architecture, operations, development, roadmap, and evidence

## Required checks

```bash
npm test
npm run docs:check
npm run package:check
npm --prefix cloud test
npm --prefix cloud run lint
```

Use the smallest relevant set while iterating and run `npm run check` before
hand-off when runtime, cloud, CI, package, or documentation behavior changed.

## Test safety

- Use temporary directories and synthetic sessions by default.
- Never read or modify a real provider session unless the user explicitly
  authorizes a gated acceptance test.
- Never put a provider key, Runner token, transcript, private snapshot, or
  identifying local path in code, fixtures, logs, screenshots, docs, commits,
  issues, or pull requests.
- For fork behavior, prove `publish → start → continue → end` and compare the
  source digest before and after.
- Production tests are opt-in and must not be inferred from ordinary unit-test
  authorization.

## Change discipline

- Inspect the working tree before editing and preserve unrelated user changes.
- Add or update behavior-level tests before runtime changes.
- Keep README copy outcome-first and implementation detail in `docs/`.
- Keep English and Chinese public copy aligned.
- Update `CHANGELOG.md` for user-visible behavior.
- Record production evidence only after the described workflow actually passes.
- Use conventional commit subjects such as `feat(runner): ...` or
  `docs(readme): ...`.
