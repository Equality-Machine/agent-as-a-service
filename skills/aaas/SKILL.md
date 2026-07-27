---
name: aaas
description: Publish the current Codex or Claude Code conversation as a fork-safe Agent, or find and use a published Agent by Agent ID. Use when the user says 发布当前对话, 发布成 Agent, use Agent ID, 调用 Agent, or continue an AaaS conversation.
---

# AaaS

Use the `aaas` MCP tools. Never upload a session file, local path, transcript, API
key, or runner token yourself.

## Installation roles

A user who only calls other people's Agents is a `consumer`. Consumers need the
Skill and MCP only; they do not need a Runner and must not be asked to install
one.

Publishing with `local` execution promotes the machine to a `publisher`:

1. Call `runner_status` before collecting or exposing any local Runner secret.
2. If the Runner is not installed and running, explain that publishing requires
   a persistent background execution service on this machine.
3. Ask for explicit confirmation before changing the machine.
4. After confirmation, call `install_local_runner`.
5. Continue only when it returns `configured: true`, `installed: true`, and
   `running: true`.

Do not call `runner_status` or `install_local_runner` merely to use an existing
Agent.

## Publish the current conversation

1. Collect a public `name` and optional `description`.
2. Ask the user to choose execution mode only when it is missing:
   - `local`: private files and runtime remain on this machine. The AaaS MCP or
     Runner daemon must stay online. Follow the publisher promotion flow above.
   - `cloud`: use only when this installation is running on the user's server.
     Require the registered `runner_id` and `runner_token`; treat the token as
     secret and never repeat it in the final response.
3. Immediately before publishing, show the public name, description, provider,
   and execution mode, and ask for confirmation because the Agent ID will be
   publicly discoverable.
4. Call `publish_current_agent`.
5. Return the exact `agentId` and `shareUrl`. Explain that publishing created an
   immutable AgentVersion and did not expose the local source path.

If current-session detection fails, ask the user for the provider and session ID,
then retry. Do not silently choose a different session.

## Use an Agent

1. Do not check or install a Runner.
2. If needed, call `find_agent` with the Agent ID and show the Agent name,
   provider, and execution mode.
3. For the first message call `agent_start`.
4. Preserve the returned `conversationId`.
5. For every later message in that same user interaction, call `agent_continue`
   with that `conversationId`.
6. When the user says the interaction is finished, call `agent_end`.

Never reuse a conversation ID for a different user or an explicitly new
conversation. Each `agent_start` is a new fork and cannot write into the
publisher's source Session.

## Failure handling

- `runner offline` or timeout: say whether the Agent uses a local or cloud runner.
- Local Runner missing during publish: call `runner_status`, explain the
  background-service change, and request confirmation before
  `install_local_runner`.
- Source digest mismatch: stop; the immutable version failed verification.
- Cloud Runner credentials missing: ask the user to complete one-time server
  enrollment; do not fall back to local mode.
- Ended conversation: start a new conversation only after telling the user.

See [REFERENCE.md](REFERENCE.md) for the object model and install commands.
