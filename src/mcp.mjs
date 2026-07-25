const TOOLS = [
  {
    name: "list_agents",
    description: "List Agent as a Service agents available to call.",
    inputSchema: {
      type: "object",
      properties: {},
      additionalProperties: false,
    },
  },
  {
    name: "agent_start",
    description:
      "Start a new task with an agent. This always creates a fresh isolated conversation fork.",
    inputSchema: {
      type: "object",
      properties: {
        agent: { type: "string", description: "Published agent ID" },
        input: { type: "string", description: "First message" },
      },
      required: ["agent", "input"],
      additionalProperties: false,
    },
  },
  {
    name: "agent_continue",
    description: "Continue an existing conversation fork for the same task.",
    inputSchema: {
      type: "object",
      properties: {
        conversation_id: { type: "string" },
        input: { type: "string" },
      },
      required: ["conversation_id", "input"],
      additionalProperties: false,
    },
  },
  {
    name: "agent_end",
    description:
      "End a conversation after the current task. Do not reuse it for a new task.",
    inputSchema: {
      type: "object",
      properties: {
        conversation_id: { type: "string" },
      },
      required: ["conversation_id"],
      additionalProperties: false,
    },
  },
];

function toolResult(value) {
  return {
    content: [{ type: "text", text: JSON.stringify(value) }],
    structuredContent: value,
    isError: false,
  };
}

export async function handleMcp(service, request) {
  const id = request.id;
  if (request.jsonrpc !== "2.0") {
    return { jsonrpc: "2.0", id: id ?? null, error: { code: -32600, message: "Invalid Request" } };
  }
  if (request.method === "initialize") {
    return {
      jsonrpc: "2.0",
      id,
      result: {
        protocolVersion: request.params?.protocolVersion ?? "2025-03-26",
        capabilities: { tools: { listChanged: false } },
        serverInfo: { name: "aaas", version: "0.1.0" },
      },
    };
  }
  if (request.method === "tools/list") {
    return { jsonrpc: "2.0", id, result: { tools: TOOLS } };
  }
  if (request.method === "tools/call") {
    const { name, arguments: args = {} } = request.params ?? {};
    let result;
    if (name === "list_agents") {
      result = toolResult({ agents: await service.listAgents() });
    } else if (name === "agent_start") {
      const response = await service.createResponse({ agent: args.agent, input: args.input });
      result = toolResult({
        conversation_id: response.conversation_id,
        output: response.output[0].text,
      });
    } else if (name === "agent_continue") {
      const response = await service.createResponse({
        conversation: args.conversation_id,
        input: args.input,
      });
      result = toolResult({
        conversation_id: response.conversation_id,
        output: response.output[0].text,
      });
    } else if (name === "agent_end") {
      const conversation = await service.endBranch(args.conversation_id);
      result = toolResult({
        conversation_id: conversation.id,
        status: "closed",
      });
    } else {
      return {
        jsonrpc: "2.0",
        id,
        error: { code: -32602, message: `Unknown tool: ${name}` },
      };
    }
    return { jsonrpc: "2.0", id, result };
  }
  return { jsonrpc: "2.0", id, error: { code: -32601, message: "Method not found" } };
}

export { TOOLS };
