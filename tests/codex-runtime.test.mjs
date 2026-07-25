import assert from "node:assert/strict";
import { chmod, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import { CodexRuntime } from "../src/runtimes/codex.mjs";

test("Codex runtime uses app-server thread/fork then thread/resume", async () => {
  const fixtureDir = await mkdtemp(path.join(tmpdir(), "aaas-codex-"));
  const executable = path.join(fixtureDir, "fake-codex.mjs");
  const traceFile = path.join(fixtureDir, "trace.jsonl");
  const sourceFile = path.join(fixtureDir, "source.jsonl");
  await writeFile(sourceFile, '{"source":"immutable"}\n');
  await writeFile(
    executable,
    `#!/usr/bin/env node
import readline from "node:readline";
import { appendFileSync } from "node:fs";
const rl = readline.createInterface({ input: process.stdin });
for await (const line of rl) {
  const message = JSON.parse(line);
  appendFileSync(process.env.AAAS_TRACE, JSON.stringify(message) + "\\n");
  if (!("id" in message)) continue;
  if (message.method === "initialize") {
    console.log(JSON.stringify({ id: message.id, result: { userAgent: "fake" } }));
  } else if (message.method === "thread/fork") {
    console.log(JSON.stringify({ id: message.id, result: { thread: { id: "codex-fork-1" } } }));
  } else if (message.method === "thread/resume") {
    console.log(JSON.stringify({ id: message.id, result: { thread: { id: message.params.threadId } } }));
  } else if (message.method === "thread/goal/clear") {
    console.log(JSON.stringify({ id: message.id, result: {} }));
  } else if (message.method === "turn/start") {
    console.log(JSON.stringify({ id: message.id, result: { turn: { id: "turn-1" } } }));
    console.log(JSON.stringify({ method: "item/completed", params: {
      threadId: message.params.threadId,
      turnId: "turn-1",
      item: { type: "agentMessage", id: "item-1", text: "reply:" + message.params.input[0].text }
    }}));
    console.log(JSON.stringify({ method: "turn/completed", params: {
      threadId: message.params.threadId,
      turn: { id: "turn-1", status: "completed", items: [] }
    }}));
  }
}
`,
  );
  await chmod(executable, 0o755);
  const runtime = new CodexRuntime({
    executable,
    executableArgs: ["app-server", "--stdio"],
    env: { ...process.env, AAAS_TRACE: traceFile },
  });
  const source = {
    sessionId: "codex-source",
    cwd: fixtureDir,
    path: sourceFile,
    beforeTurnId: "turn-publish-boundary",
  };

  const first = await runtime.fork({ source, message: "first" });
  const second = await runtime.continue({
    agent: { source },
    runtimeSessionId: first.runtimeSessionId,
    message: "second",
  });

  assert.equal(first.runtimeSessionId, "codex-fork-1");
  assert.equal(first.text, "reply:first");
  assert.equal(second.text, "reply:second");
  const calls = (await readFile(traceFile, "utf8"))
    .trim()
    .split("\n")
    .map((line) => JSON.parse(line));
  assert.equal(calls.filter((call) => call.method === "thread/fork").length, 1);
  const forkCall = calls.find((call) => call.method === "thread/fork");
  assert.equal(forkCall.params.threadId, "codex-source");
  assert.equal(forkCall.params.path, sourceFile);
  assert.equal(forkCall.params.beforeTurnId, "turn-publish-boundary");
  assert.equal(calls.filter((call) => call.method === "thread/goal/clear").length, 1);
  assert.equal(
    calls.find((call) => call.method === "thread/goal/clear").params.threadId,
    "codex-fork-1",
  );
  assert.equal(calls.filter((call) => call.method === "thread/resume").length, 1);
  assert.equal(calls.find((call) => call.method === "thread/resume").params.threadId, "codex-fork-1");
  assert.equal(await readFile(sourceFile, "utf8"), '{"source":"immutable"}\n');
});
