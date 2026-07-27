# Security

Please do not put API keys, Provider credentials, Runner tokens, private Session
files, local paths, or transcripts in a public issue.

For a vulnerability, use this repository's private GitHub security-advisory
reporting flow. Include the affected commit, reproduction steps, impact, and a
minimal proof that does not expose real user data.

The current public deployment is a functional acceptance environment. It does
not yet include accounts, quotas, billing, or a complete multi-tenant abuse
prevention layer. See [`README.md`](README.md#安全边界) for the documented trust
boundary.
