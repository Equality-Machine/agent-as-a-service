import assert from "node:assert/strict";
import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import { discoverSessions } from "../src/session-discovery.mjs";

test("discovers Codex and Claude sessions without exposing transcript content", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "aaas-discovery-"));
  const codexRoot = path.join(root, "codex");
  const claudeRoot = path.join(root, "claude");
  await mkdir(codexRoot);
  await mkdir(claudeRoot);
  await writeFile(
    path.join(codexRoot, "rollout.jsonl"),
    [
      JSON.stringify({
        type: "session_meta",
        payload: { id: "codex-1", cwd: "/work/codex" },
      }),
      JSON.stringify({
        type: "response_item",
        payload: {
          type: "message",
          role: "user",
          content: [{ type: "input_text", text: "Design an isolated service" }],
        },
      }),
    ].join("\n"),
  );
  await writeFile(
    path.join(claudeRoot, "claude-1.jsonl"),
    `${JSON.stringify({
      type: "user",
      sessionId: "claude-1",
      cwd: "/work/claude",
      message: { content: "Review this architecture" },
    })}\n`,
  );

  const codex = await discoverSessions({ provider: "codex", roots: [codexRoot] });
  const claude = await discoverSessions({ provider: "claude", roots: [claudeRoot] });

  assert.deepEqual(
    { id: codex[0].sessionId, cwd: codex[0].cwd, preview: codex[0].preview },
    { id: "codex-1", cwd: "/work/codex", preview: "Design an isolated service" },
  );
  assert.deepEqual(
    { id: claude[0].sessionId, cwd: claude[0].cwd, preview: claude[0].preview },
    { id: "claude-1", cwd: "/work/claude", preview: "Review this architecture" },
  );
  assert.ok(codex[0].path.endsWith("rollout.jsonl"));
});
