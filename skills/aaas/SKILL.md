---
name: aaas
description: Publish the current Codex or Claude Code conversation as a fork-safe Agent, or find and use a published Agent by Agent ID. Use when the user says 发布当前对话, 发布成 Agent, use Agent ID, 调用 Agent, or continue an AaaS conversation.
---

# AaaS

Use the `aaas` MCP tools. Never upload a session file, local path, transcript, API
key, or runner token yourself.

## Publish the current conversation

1. Collect a public `name` and optional `description`.
2. Ask the user to choose execution mode only when it is missing:
   - `local`: private files and runtime remain on this machine. The AaaS MCP or
     runner daemon must stay online.
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

1. If needed, call `find_agent` with the Agent ID and show the Agent name,
   provider, and execution mode.
2. For the first message call `agent_start`.
3. Preserve the returned `conversationId`.
4. For every later message in that same user interaction, call `agent_continue`
   with that `conversationId`.
5. When the user says the interaction is finished, call `agent_end`.

Never reuse a conversation ID for a different user or an explicitly new
conversation. Each `agent_start` is a new fork and cannot write into the
publisher's source Session.

## Failure handling

- `runner offline` or timeout: say whether the Agent uses a local or cloud runner.
- Source digest mismatch: stop; the immutable version failed verification.
- Cloud Runner credentials missing: ask the user to complete one-time server
  enrollment; do not fall back to local mode.
- Ended conversation: start a new conversation only after telling the user.

See [REFERENCE.md](REFERENCE.md) for the object model and install commands.
