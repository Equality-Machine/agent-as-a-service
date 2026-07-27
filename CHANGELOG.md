# Changelog

All notable changes to AaaS are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/)
and the project follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Open-source community files, contribution workflow, repository checks, and a
  bilingual project introduction.
- Repository documentation index, development guide, roadmap, and archived
  product research.
- Outcome-led issue forms and pull request guidance for safer, easier
  contributions.

### Changed

- Reorganized design evidence and screenshots under `docs/`.
- Reframed the README, web entry, Agent share page, install guide, metadata,
  and social preview around the user journey from shared context to completed
  work.
- Clarified the consumer, publisher, and server Runner paths across every
  public entry point.

## [0.2.1] - 2026-07-27

### Added

- Consumer, publisher, and server Runner installation roles.
- On-demand local Runner installation with explicit user confirmation.
- Machine-readable Agent share manifests for Codex and Claude Code.
- Markdown and image rendering in the web conversation experience.
- Bilingual cinematic web experience with a clear Agent ID entry path.
- Job stages, lease renewal, active cancellation, and runtime timeout reporting.

### Changed

- Isolated Codex runtime configuration from publisher MCP, plugins, Apps,
  hooks, Skills, and memory.
- Restricted job consumption to persistent Runners.
- Reloaded source snapshots after each job claim so newly published versions
  are available without a Runner restart.

### Fixed

- Avoided false offline reports while a claimed job was still executing.
- Added macOS fallback when a broken npm Codex wrapper points to a missing
  native binary.
- Prevented post-completion heartbeat races from invalidating terminal jobs.
