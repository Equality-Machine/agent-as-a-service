import assert from "node:assert/strict";
import { chmod, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import { ClaudeRuntime } from "../src/runtimes/claude.mjs";

test("Claude runtime forks once, resumes the fork, and never resumes the source directly", async () => {
  const fixtureDir = await mkdtemp(path.join(tmpdir(), "aaas-claude-"));
  const executable = path.join(fixtureDir, "fake-claude.mjs");
  const traceFile = path.join(fixtureDir, "trace.jsonl");
  const sourceFile = path.join(fixtureDir, "source.jsonl");
  await writeFile(sourceFile, '{"source":"immutable"}\n');
  await writeFile(
    executable,
    `#!/usr/bin/env node
import { appendFileSync } from "node:fs";
const args = process.argv.slice(2);
appendFileSync(process.env.AAAS_TRACE, JSON.stringify(args) + "\\n");
const isFork = args.includes("--fork-session");
process.stdout.write(JSON.stringify({
  session_id: isFork ? "claude-fork-1" : args[args.indexOf("--resume") + 1],
  result: isFork ? "fork reply" : "continued reply"
}));
`,
  );
  await chmod(executable, 0o755);

  const runtime = new ClaudeRuntime({
    executable,
    env: { ...process.env, AAAS_TRACE: traceFile },
  });
  const source = { sessionId: "claude-source", cwd: fixtureDir, path: sourceFile };
  const first = await runtime.fork({ source, message: "first" });
  const second = await runtime.continue({
    runtimeSessionId: first.runtimeSessionId,
    message: "second",
    agent: { source },
  });

  assert.equal(first.runtimeSessionId, "claude-fork-1");
  assert.equal(second.text, "continued reply");
  const calls = (await readFile(traceFile, "utf8"))
    .trim()
    .split("\n")
    .map((line) => JSON.parse(line));
  assert.ok(calls[0].includes("--fork-session"));
  assert.equal(calls[0][calls[0].indexOf("--resume") + 1], "claude-source");
  assert.ok(!calls[1].includes("--fork-session"));
  assert.equal(calls[1][calls[1].indexOf("--resume") + 1], "claude-fork-1");
  assert.equal(await readFile(sourceFile, "utf8"), '{"source":"immutable"}\n');
});

test("Claude runtime materializes an immutable template instead of resuming the publisher source", async () => {
  const fixtureDir = await mkdtemp(path.join(tmpdir(), "aaas-claude-template-"));
  const configDir = path.join(fixtureDir, "claude-config");
  const executable = path.join(fixtureDir, "fake-claude.mjs");
  const traceFile = path.join(fixtureDir, "trace.jsonl");
  const sourceFile = path.join(fixtureDir, "snapshot.jsonl");
  await writeFile(
    sourceFile,
    `${JSON.stringify({
      type: "assistant",
      sessionId: "publisher-session",
      message: { role: "assistant", stop_reason: "end_turn" },
    })}\n`,
  );
  await writeFile(
    executable,
    `#!/usr/bin/env node
import { appendFileSync } from "node:fs";
const args = process.argv.slice(2);
appendFileSync(process.env.AAAS_TRACE, JSON.stringify(args) + "\\n");
process.stdout.write(JSON.stringify({session_id:"consumer-fork",result:"ok"}));
`,
  );
  await chmod(executable, 0o755);
  const runtime = new ClaudeRuntime({
    executable,
    configDir,
    env: { ...process.env, AAAS_TRACE: traceFile },
  });
  const source = {
    sessionId: "template-session",
    originalSessionId: "publisher-session",
    templateSessionId: "template-session",
    cwd: fixtureDir,
    path: sourceFile,
  };

  await runtime.fork({ source, message: "hello" });
  const args = JSON.parse((await readFile(traceFile, "utf8")).trim());
  assert.equal(args[args.indexOf("--resume") + 1], "template-session");
  const projectKey = fixtureDir.replaceAll(/[^a-zA-Z0-9]/g, "-");
  const materialized = await readFile(
    path.join(configDir, "projects", projectKey, "template-session.jsonl"),
    "utf8",
  );
  assert.match(materialized, /"sessionId":"template-session"/);
  assert.doesNotMatch(materialized, /publisher-session/);
});
