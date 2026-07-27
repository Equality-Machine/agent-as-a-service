# Contributing to AaaS

Thank you for helping make long-lived Agent context easier to share safely.
AaaS welcomes bug reports, design discussions, documentation improvements,
runtime adapters, tests, and focused code changes.

## Before you start

- Read the [Code of Conduct](CODE_OF_CONDUCT.md).
- Search existing issues and discussions before opening a new one.
- Use a public issue only for information that is safe to disclose.
- Report vulnerabilities through the private process in
  [SECURITY.md](SECURITY.md).

Never include API keys, Runner tokens, provider credentials, private session
files, transcripts, user data, or identifying local paths in an issue, fixture,
log, screenshot, commit, or pull request.

## Ways to contribute

- **Question or idea:** start a GitHub Discussion.
- **Confirmed bug:** use the bug report form.
- **Feature proposal:** use the feature request form and explain the user
  problem before the implementation.
- **Small documentation fix:** open a pull request directly.
- **Large runtime or architecture change:** open an issue first so the boundary,
  migration, and acceptance plan can be agreed before implementation.

## Development setup

Requirements:

- Node.js 22 or newer
- npm
- Git
- Codex or Claude Code only when running gated real-provider acceptance

```bash
git clone https://github.com/Equality-Machine/agent-as-a-service.git
cd agent-as-a-service
npm ci
npm --prefix cloud ci
```

Useful commands:

```bash
npm test                 # root unit and contract suite
npm run docs:check       # repository and Markdown link checks
npm run package:check    # verify the npm package contents
npm run check            # root + cloud build, tests, lint, docs, package
npm run test:e2e         # gated real-runtime tests
```

The ordinary test suite must not require provider credentials or modify a real
Codex or Claude Code session. See [Development](docs/DEVELOPMENT.md) for the
repository layout and test boundaries.

## Design and architecture rules

Changes must preserve these product contracts:

1. A consumer does not need a Runner.
2. Publishing locally may install a persistent Runner only after explicit user
   confirmation.
3. Agent, AgentVersion, source Session, and consumer Conversation remain
   separate objects.
4. Every `agent_start` creates a new consumer-owned branch.
5. Continuing a Conversation resumes only its own provider child session.
6. Source paths, transcripts, provider child IDs, credentials, and Runner
   tokens are never returned through public interfaces.
7. Runtime isolation claims must be backed by implementation and tests.

Read [Architecture](docs/ARCHITECTURE.md) before changing publishing, Runner,
capsule, lease, cancellation, or provider runtime behavior.

## Change workflow

1. Create a focused branch from `main`.
2. Add or update tests before changing runtime behavior.
3. Keep generated files and unrelated cleanup out of the same pull request.
4. Use a conventional commit subject such as:

   ```text
   feat(runner): reload source snapshots after job claim
   fix(installer): avoid installing Runner for consumers
   docs(readme): clarify local and cloud execution
   ```

5. Run the checks relevant to the changed area.
6. Open a pull request using the repository template.

Pull requests should explain:

- the user or developer problem;
- the chosen behavior and trade-offs;
- security or compatibility impact;
- the exact checks that passed;
- any remaining limitation or follow-up.

## Test expectations

| Changed area | Minimum verification |
| --- | --- |
| Documentation or repository metadata | `npm run docs:check` |
| Installer, Skill, MCP, publisher, Runner, runtime | `npm test` |
| `cloud/` UI or API | `npm --prefix cloud test` and `npm --prefix cloud run lint` |
| Package contents or executable entry | `npm run package:check` |
| Provider-specific fork behavior | matching gated E2E test with an authorized test session |

Real-provider and production tests are opt-in because they can create remote
jobs or consume provider quota. Never turn them into an implicit CI requirement.

## Documentation

- Write the main README for a global audience and keep
  [README.zh-CN.md](README.zh-CN.md) aligned for Chinese readers.
- Prefer user outcomes in the README; keep implementation detail in `docs/`.
- Label observed behavior, intended behavior, and unimplemented roadmap items
  clearly.
- Update [CHANGELOG.md](CHANGELOG.md) for user-visible changes.
- Add acceptance evidence to [docs/VERIFICATION.md](docs/VERIFICATION.md) only
  after the described workflow was actually exercised.

## License

By contributing, you agree that your contribution is licensed under the
[MIT License](LICENSE).
