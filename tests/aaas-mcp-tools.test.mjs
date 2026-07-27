import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { chmod, mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { createServer } from "node:http";
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

test("publishing MCP never competes with the persistent runner for jobs", async (t) => {
  const home = await mkdtemp(path.join(tmpdir(), "aaas-publisher-mcp-home-"));
  const dataDir = path.join(home, ".aaas");
  const sessionId = "publisher-only-session";
  const sessionDir = path.join(home, ".codex", "sessions");
  const sourcePath = path.join(sessionDir, "source.jsonl");
  await mkdir(sessionDir, { recursive: true });
  await writeFile(
    sourcePath,
    [
      JSON.stringify({
        type: "session_meta",
        payload: { id: sessionId, cwd: home },
      }),
      JSON.stringify({
        type: "turn_context",
        payload: { turn_id: "publish-boundary" },
      }),
      "",
    ].join("\n"),
  );

  const binDir = path.join(home, "bin");
  await mkdir(binDir, { recursive: true });
  const manager = process.platform === "darwin" ? "launchctl" : "systemctl";
  const managerPath = path.join(binDir, manager);
  await writeFile(managerPath, "#!/bin/sh\nexit 0\n");
  await chmod(managerPath, 0o755);
  const serviceFile =
    process.platform === "darwin"
      ? path.join(
          home,
          "Library",
          "LaunchAgents",
          "com.efflora.aaas-runner.plist",
        )
      : path.join(
          home,
          ".config",
          "systemd",
          "user",
          "aaas-runner.service",
        );
  await mkdir(path.dirname(serviceFile), { recursive: true });
  await writeFile(serviceFile, "installed");

  let nextPolls = 0;
  const server = createServer((request, response) => {
    if (request.method === "POST" && request.url === "/api/v1/publish") {
      response.writeHead(201, { "content-type": "application/json" });
      response.end(
        JSON.stringify({
          agent: {
            id: "agt_publisher_only",
            versionId: "ver_publisher_only",
            name: "Publisher only",
            executionMode: "local",
          },
        }),
      );
      return;
    }
    if (request.method === "GET" && request.url?.endsWith("/next")) {
      nextPolls += 1;
      response.writeHead(204);
      response.end();
      return;
    }
    response.writeHead(404, { "content-type": "application/json" });
    response.end(JSON.stringify({ error: "not found" }));
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  t.after(() => server.close());
  const cloudUrl = `http://127.0.0.1:${server.address().port}`;

  const child = spawn(process.execPath, ["src/aaas-mcp-stdio.mjs"], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      HOME: home,
      AAAS_HOME: home,
      AAAS_DATA_DIR: dataDir,
      AAAS_CLOUD_URL: cloudUrl,
      CODEX_THREAD_ID: sessionId,
      PATH: `${binDir}${path.delimiter}${process.env.PATH}`,
    },
    stdio: ["pipe", "pipe", "pipe"],
  });
  t.after(() => child.kill("SIGTERM"));
  const lines = readline.createInterface({ input: child.stdout });
  const published = new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("publish timed out")), 5_000);
    lines.once("line", (line) => {
      clearTimeout(timer);
      resolve(JSON.parse(line));
    });
  });
  child.stdin.write(
    `${JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "tools/call",
      params: {
        name: "publish_current_agent",
        arguments: {
          name: "Publisher only",
          provider: "codex",
          execution_mode: "local",
        },
      },
    })}\n`,
  );
  const response = await published;
  assert.equal(response.result.isError, false, JSON.stringify(response));
  await new Promise((resolve) => setTimeout(resolve, 200));
  child.stdin.end();

  assert.equal(nextPolls, 0);
});
