# Security policy

AaaS handles private provider sessions, local source snapshots, Runner
credentials, and remote execution. Please report security issues privately and
avoid putting real user data at risk while testing.

## Supported versions

| Version | Support |
| --- | --- |
| `main` | Active development |
| `0.2.x` | Public preview fixes |
| `< 0.2` | Not supported |

The hosted public control plane is a functional preview and has no uptime,
support, or vulnerability-reward SLA.

## Report a vulnerability

Use this repository's
[private GitHub security-advisory flow](https://github.com/Equality-Machine/agent-as-a-service/security/advisories/new).
Do not open a public issue.

Include:

- the affected version or commit;
- the affected surface and execution mode;
- a minimal reproduction using synthetic data;
- the security impact and realistic attack prerequisites;
- whether source sessions, capsules, credentials, or other users are exposed;
- a suggested mitigation, if known.

Do not include a live provider key, Runner token, private session file,
transcript, local home path, or data belonging to another person.

## Response targets

Maintainers make a best-effort attempt to:

- acknowledge a complete report within 3 business days;
- provide an initial severity assessment within 7 business days;
- coordinate remediation and disclosure based on impact and exploitability.

Complex runtime or provider issues may take longer. Please allow a reasonable
remediation window before public disclosure.

## In scope

- installer role escalation or unwanted Runner installation;
- source-session or transcript disclosure;
- cross-conversation access or writes;
- Runner authentication, lease, or job-claim bypass;
- encrypted capsule confidentiality or integrity failures;
- control-plane authorization or data-isolation failures;
- secret exposure through logs, errors, manifests, or package contents;
- sandbox or runtime isolation bypass specific to AaaS.

## Out of scope

- vulnerabilities in Codex, Claude Code, Cloudflare, Sites, Node.js, or another
  third-party product that do not arise from AaaS;
- availability of a publisher-operated local Runner;
- missing accounts, quotas, billing, or anti-abuse features already disclosed
  as preview limitations;
- automated scan output without manual validation and concrete impact;
- social engineering, physical access, denial of service, or testing that
  accesses another user's data.

## Safe testing

- Use synthetic sessions, Agents, Conversations, and credentials.
- Do not degrade the public service or run indiscriminate scanners.
- Stop if testing could expose or modify data you do not own.
- Prefer a local control plane and isolated Runner for proof of concept.
- Remove sensitive values and identifying paths from screenshots and logs.

## Current trust boundary

The control plane stores public metadata, Agent and Conversation state,
messages, job leases, Runner token hashes, and encrypted cloud capsules. Local
source paths, raw provider session files, and provider credentials remain on
the Runner.

Cloud capsule encryption protects stored capsule content and callers without
the Runner secret. The preview currently trusts the control-plane runtime and
the paired Runner host. Write-enabled tools require additional per-conversation
workspace, identity, secret, network, and approval isolation.

See [Architecture](docs/ARCHITECTURE.md) for the complete model.
