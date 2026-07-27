## Outcome

<!-- In one or two sentences: what becomes better for users, operators, or contributors? -->

## Why now

<!-- What problem, evidence, issue, or repeated friction motivated this change? -->

## What changed

<!-- Add a focused list of changes. -->

## Product and compatibility impact

<!-- Cover public APIs, installer roles, Agent/Conversation semantics, data migrations, or "none". -->

## Security and isolation

<!-- Cover source sessions, Runner trust, secrets, files, network, identity, external writes, or "none". -->

## Verification

<!-- List exact commands and real workflows that passed. Do not write only "tests pass". -->

- [ ] `npm test`
- [ ] `npm run docs:check`
- [ ] `npm run package:check`
- [ ] `npm --prefix cloud test`
- [ ] `npm --prefix cloud run lint`
- [ ] Gated real-provider or production acceptance, when required

## Evidence

<!-- Add redacted screenshots, logs, markers, or source-digest proof when they materially help review. -->

## Documentation and release

- [ ] User-facing documentation is updated or not required.
- [ ] `CHANGELOG.md` is updated or not required.
- [ ] No secret, private transcript, Runner token, provider child ID, or identifying local path is included.
- [ ] The pull request is focused and does not stage unrelated user files.

Closes #
