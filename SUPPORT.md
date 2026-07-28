# Support

## Choose the right channel

- **How do I use or deploy AaaS?** Start a
  [GitHub Discussion](https://github.com/Equality-Machine/agent-as-a-service/discussions).
- **I found a reproducible bug.** Open a
  [bug report](https://github.com/Equality-Machine/agent-as-a-service/issues/new?template=bug.yml).
- **I have a product or architecture idea.** Open a
  [feature request](https://github.com/Equality-Machine/agent-as-a-service/issues/new?template=feature.yml).
- **I found a vulnerability.** Follow the private process in
  [SECURITY.md](SECURITY.md); do not open a public issue.

## Before asking for help

1. Read the [README](README.md) and [installation guide](docs/INSTALL.md).
2. Search open and closed issues.
3. Run the relevant local check if possible.
4. Remove all secrets and private session content from logs.

For installation problems, include:

- operating system and architecture;
- Node.js version;
- Codex or Claude Code version;
- selected role (`consumer`, `publisher`, or `runner`);
- the command that failed;
- a minimal, redacted error message.

For runtime problems, also include:

- local or cloud execution mode;
- the visible job stage;
- whether the Runner status is online;
- whether the failure affects every Agent or one Agent;
- a synthetic Agent or Conversation ID only if it contains no private data.

## Support boundary

This project is maintained on a best-effort basis. The public deployment is a
functional preview, not a hosted service with an uptime or support SLA.
Production adopters should operate their own control plane and Runner fleet,
pin versions, monitor jobs, and maintain a recovery plan.
