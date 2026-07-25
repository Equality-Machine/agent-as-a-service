function slug(value) {
  return (
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 48) || "published-agent"
  );
}

export function renderAgentSkill(agent, baseUrl) {
  const name = `aaas-${slug(agent.name)}-${agent.id.slice(0, 8)}`;
  return `---
name: ${name}
description: Call the published "${agent.name}" through Agent as a Service.
---

# ${agent.name}

Use this skill when a task benefits from the published "${agent.name}" agent.

## Endpoint

- Base URL: ${baseUrl}
- Agent ID: ${agent.id}
- MCP endpoint: ${baseUrl}/mcp

## Required lifecycle

1. Start every new task with the MCP tool \`agent_start\` using agent \`${agent.id}\`.
2. Keep the returned \`conversation_id\` for this task only.
3. Use \`agent_continue\` for follow-up messages in the same task.
4. Call \`agent_end\` when the task finishes.
5. Never reuse a conversation ID for a different task or user.

The service creates an isolated fork on the first message. It never appends these
messages to the original source session.

## HTTP fallback

Start:

\`\`\`bash
curl -sS ${baseUrl}/v1/responses \\
  -H 'content-type: application/json' \\
  -d '{"agent":"${agent.id}","input":"YOUR MESSAGE"}'
\`\`\`

Continue by replacing \`CONVERSATION_ID\`:

\`\`\`bash
curl -sS ${baseUrl}/v1/responses \\
  -H 'content-type: application/json' \\
  -d '{"conversation":"CONVERSATION_ID","input":"FOLLOW-UP"}'
\`\`\`
`;
}
