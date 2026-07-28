# Roadmap

AaaS is currently a public preview. This roadmap communicates direction, not a
delivery promise. Priorities may change as the isolation model and real usage
produce new evidence.

## Shipped foundation

- Stable Agent identity and immutable AgentVersion boundary
- Independent consumer Conversations backed by provider-native forks
- Codex and Claude Code publishing and continuation
- Web, Skill, MCP, and HTTP access
- Consumer installation without a Runner
- On-demand local publisher Runner with explicit confirmation
- Encrypted cloud source capsules and paired server Runners
- Job leases, stages, heartbeat renewal, cancellation, and runtime timeouts
- Bilingual web experience with Markdown and image rendering
- Real-provider source-immutability and two-turn acceptance

## Next

### Identity and access

- Publisher accounts and Agent ownership
- Private, organization, link, and public visibility
- Per-Agent and per-version access policy
- Revocation and audit history

### Operational reliability

- Runner fleet health and version compatibility
- Retry and idempotency policy across network failures
- Usage, latency, error, and cost observability
- Version pinning, rollback, deprecation, and withdrawal

### Runtime capability manifest

- Required provider, model, workspace, Skill, MCP, and network capabilities
- Secret names and whether publisher or consumer supplies them
- Clear file, network, tool, and side-effect permissions on the Agent page
- Integrity and provenance metadata

## Later

### Stronger side-effect isolation

- Per-conversation worktrees or containers
- Tenant-scoped identities and secret grants
- Network allowlists and filesystem scopes
- Approval gates for email, browser, database, and external writes

### Distribution and ecosystem

- A2A Agent Card export
- Searchable Agent directory and verified publishers
- SDKs and stable OpenAPI documentation
- Usage quotas, billing, and creator economics
- Reusable deployment recipes for common clouds

## Non-goals for the preview

- Claiming that a copied conversation automatically carries all local tools,
  Keychain identities, repositories, or desktop permissions
- Running untrusted write-enabled Agents without additional isolation
- Treating protocol compatibility as proof of runtime safety
- Exposing publisher session paths, transcripts, credentials, or provider child
  session IDs to consumers

## How to influence the roadmap

Start a GitHub Discussion for product direction or open a feature request with:

- the user and scenario;
- the current workaround;
- the security and isolation implications;
- the smallest useful outcome;
- how success could be verified.
