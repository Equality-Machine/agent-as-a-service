#!/usr/bin/env node
import os from "node:os";
import path from "node:path";
import readline from "node:readline";
import { fileURLToPath } from "node:url";

import { CloudClient } from "./cloud-client.mjs";
import { CloudState } from "./cloud-state.mjs";
import { Publisher } from "./publisher.mjs";
import {
  getRunnerServiceStatus,
  installRunnerService,
} from "./runner-service.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const home = path.resolve(process.env.AAAS_HOME ?? os.homedir());
const dataDir = path.resolve(
  process.env.AAAS_DATA_DIR ?? path.join(home, ".aaas"),
);
const cloudUrl = process.env.AAAS_CLOUD_URL ?? "http://127.0.0.1:3000";
const cloud = new CloudClient({ baseUrl: cloudUrl });
const publisher = new Publisher({
  dataDir,
  cloudUrl,
  publisherToken: process.env.AAAS_PUBLISH_TOKEN ?? null,
});
const runnerState = new CloudState(dataDir);

const tools = [
  {
    name: "runner_status",
    description:
      "Check whether this machine is only a consumer or already has a persistent local AaaS Runner. Does not install or change anything.",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "install_local_runner",
    description:
      "Initialize and install a persistent local AaaS Runner. This changes the machine by adding a macOS LaunchAgent or Linux systemd service; call only after explicit user confirmation.",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "publish_current_agent",
    description:
      "Freeze the current Codex or Claude Code conversation as an immutable AgentVersion and publish it to AaaS. Returns a shareable Agent ID and web URL.",
    inputSchema: {
      type: "object",
      properties: {
        name: { type: "string", description: "Public Agent name" },
        description: { type: "string", description: "Public capability summary" },
        execution_mode: {
          type: "string",
          enum: ["local", "cloud"],
          description:
            "local keeps execution on this machine; cloud uses the installed server runner",
        },
        provider: { type: "string", enum: ["codex", "claude"] },
        session_id: {
          type: "string",
          description: "Only needed when the current session cannot be detected",
        },
        runner_id: {
          type: "string",
          description: "Registered server Runner ID for cloud execution",
        },
        runner_token: {
          type: "string",
          description:
            "Server Runner enrollment secret; never returned by this tool",
        },
      },
      required: ["name"],
    },
  },
  {
    name: "find_agent",
    description: "Find a published AaaS Agent by its Agent ID.",
    inputSchema: {
      type: "object",
      properties: { agent_id: { type: "string" } },
      required: ["agent_id"],
    },
  },
  {
    name: "agent_start",
    description:
      "Start an independent conversation fork from a published Agent and wait for its response.",
    inputSchema: {
      type: "object",
      properties: {
        agent_id: { type: "string" },
        input: { type: "string" },
      },
      required: ["agent_id", "input"],
    },
  },
  {
    name: "agent_continue",
    description:
      "Continue an existing consumer conversation without writing to the publisher's source session.",
    inputSchema: {
      type: "object",
      properties: {
        conversation_id: { type: "string" },
        input: { type: "string" },
      },
      required: ["conversation_id", "input"],
    },
  },
  {
    name: "agent_end",
    description: "End one consumer conversation branch.",
    inputSchema: {
      type: "object",
      properties: { conversation_id: { type: "string" } },
      required: ["conversation_id"],
    },
  },
];

function success(id, value) {
  return {
    jsonrpc: "2.0",
    id,
    result: {
      content: [{ type: "text", text: JSON.stringify(value, null, 2) }],
      structuredContent: value,
      isError: false,
    },
  };
}

function failure(id, error) {
  return {
    jsonrpc: "2.0",
    id,
    result: {
      content: [{ type: "text", text: error.message }],
      isError: true,
    },
  };
}

async function callTool(name, args) {
  if (name === "runner_status") {
    await runnerState.reload();
    const identity = await runnerState.getRunner();
    const service = await getRunnerServiceStatus({ home });
    return {
      configured: Boolean(identity),
      installed: service.installed,
      running: service.running,
      platform: service.platform,
      role: identity || service.installed ? "publisher" : "consumer",
    };
  }
  if (name === "install_local_runner") {
    await runnerState.reload();
    const existing = await runnerState.getRunner();
    if (existing && existing.kind !== "local") {
      throw new Error(
        "This data directory belongs to a cloud Runner; choose a separate AAAS_DATA_DIR for local publishing.",
      );
    }
    await runnerState.ensureRunner("local");
    const service = await installRunnerService({
      root,
      cloudUrl,
      dataDir,
      home,
    });
    return {
      configured: true,
      installed: service.installed,
      running: service.running,
      platform: service.platform,
      role: "publisher",
    };
  }
  if (name === "publish_current_agent") {
    if ((args.execution_mode ?? "local") === "local") {
      const service = await getRunnerServiceStatus({ home });
      if (!service.installed || !service.running) {
        throw new Error(
          "A persistent local Runner is required before publishing. Call runner_status, ask for confirmation, then call install_local_runner.",
        );
      }
    }
    const agent = await publisher.publishCurrent({
      name: args.name,
      description: args.description,
      executionMode: args.execution_mode ?? "local",
      provider: args.provider,
      sessionId: args.session_id,
      runnerId: args.runner_id,
      runnerToken: args.runner_token,
    });
    return {
      agentId: agent.id,
      versionId: agent.versionId,
      name: agent.name,
      executionMode: agent.executionMode,
      shareUrl: agent.shareUrl,
      sourceIsolation:
        "Published from a private immutable snapshot; consumer conversations are separate forks.",
    };
  }
  if (name === "find_agent") {
    return cloud.findAgent(args.agent_id);
  }
  if (name === "agent_start") {
    return cloud.invokeAndWait({ agentId: args.agent_id, input: args.input });
  }
  if (name === "agent_continue") {
    return cloud.invokeAndWait({
      conversationId: args.conversation_id,
      input: args.input,
    });
  }
  if (name === "agent_end") {
    return cloud.endConversation(args.conversation_id);
  }
  throw new Error(`Unknown tool: ${name}`);
}

const input = readline.createInterface({ input: process.stdin, crlfDelay: Infinity });
for await (const line of input) {
  if (!line.trim()) continue;
  let request;
  try {
    request = JSON.parse(line);
  } catch {
    process.stdout.write(
      `${JSON.stringify({
        jsonrpc: "2.0",
        id: null,
        error: { code: -32700, message: "Parse error" },
      })}\n`,
    );
    continue;
  }
  if (request.method?.startsWith("notifications/")) continue;
  try {
    let result;
    if (request.method === "initialize") {
      result = {
        protocolVersion: request.params?.protocolVersion ?? "2025-03-26",
        capabilities: { tools: {} },
        serverInfo: {
          name: "aaas-publisher-and-client",
          version: "0.2.0",
        },
      };
    } else if (request.method === "tools/list") {
      result = { tools };
    } else if (request.method === "tools/call") {
      process.stdout.write(
        `${JSON.stringify(
          success(
            request.id,
            await callTool(
              request.params?.name,
              request.params?.arguments ?? {},
            ),
          ),
        )}\n`,
      );
      continue;
    } else if (request.method === "ping") {
      result = {};
    } else {
      throw new Error(`Unsupported method: ${request.method}`);
    }
    process.stdout.write(
      `${JSON.stringify({ jsonrpc: "2.0", id: request.id, result })}\n`,
    );
  } catch (error) {
    process.stdout.write(`${JSON.stringify(failure(request.id, error))}\n`);
  }
}
