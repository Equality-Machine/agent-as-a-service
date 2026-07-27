import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import readline from "node:readline";
import test from "node:test";

test("installable AaaS MCP exposes publisher and consumer tools", async () => {
  const home = await mkdtemp(path.join(tmpdir(), "aaas-consumer-home-"));
  const child = spawn(process.execPath, ["src/aaas-mcp-stdio.mjs"], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      AAAS_CLOUD_URL: "http://127.0.0.1:9",
      AAAS_DATA_DIR: path.join(home, ".aaas"),
      AAAS_HOME: home,
    },
    stdio: ["pipe", "pipe", "pipe"],
  });
  const lines = readline.createInterface({ input: child.stdout });
  const responses = [];
  const received = new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("MCP response timed out")), 5_000);
    lines.on("line", (line) => {
      responses.push(JSON.parse(line));
      if (responses.length === 3) {
        clearTimeout(timer);
        resolve();
      }
    });
  });
  child.stdin.write(
    `${JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "initialize",
      params: { protocolVersion: "2025-03-26" },
    })}\n`,
  );
  child.stdin.write(
    `${JSON.stringify({
      jsonrpc: "2.0",
      id: 2,
      method: "tools/list",
      params: {},
    })}\n`,
  );
  child.stdin.write(
    `${JSON.stringify({
      jsonrpc: "2.0",
      id: 3,
      method: "tools/call",
      params: { name: "runner_status", arguments: {} },
    })}\n`,
  );
  await received;
  child.stdin.end();
  child.kill("SIGTERM");

  assert.equal(responses[0].result.serverInfo.name, "aaas-publisher-and-client");
  assert.deepEqual(
    responses[1].result.tools.map((tool) => tool.name),
    [
      "runner_status",
      "install_local_runner",
      "publish_current_agent",
      "find_agent",
      "agent_start",
      "agent_continue",
      "agent_end",
    ],
  );
  assert.deepEqual(responses[2].result.structuredContent, {
    configured: false,
    installed: false,
    running: false,
    platform: process.platform,
    role: "consumer",
  });
});
