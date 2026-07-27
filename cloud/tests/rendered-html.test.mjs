import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

test("cloud app exposes an Agent-ID-first fork-safe console", async () => {
  const [page, consoleSource, layout, css, packageJson] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/AgentConsole.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
    readFile(new URL("../package.json", import.meta.url), "utf8"),
  ]);

  assert.match(page, /<AgentConsole \/>/);
  assert.match(consoleSource, /Agent ID/);
  assert.match(consoleSource, /\/api\/v1\/agents\//);
  assert.match(consoleSource, /\/api\/v1\/invoke/);
  assert.match(consoleSource, /\/api\/v1\/jobs\/.*\/cancel/);
  assert.match(consoleSource, /排队等待 Runner/);
  assert.match(consoleSource, /启动隔离运行时/);
  assert.match(consoleSource, /Agent 执行中/);
  assert.match(consoleSource, /New conversation/);
  assert.match(consoleSource, /Source session stays immutable/);
  assert.match(layout, /AaaS — Agent as a Service/);
  assert.match(css, /--orange:\s*#ff5d1d/);
  assert.doesNotMatch(packageJson, /react-loading-skeleton/);
  await assert.rejects(
    access(new URL("../app/_sites-preview/SkeletonPreview.tsx", import.meta.url)),
  );
});

test("cloud API implements publish, lookup, invoke, leases, and branch end", async () => {
  const api = await readFile(
    new URL("../app/api/v1/[...path]/route.ts", import.meta.url),
    "utf8",
  );
  for (const contract of [
    "publish(request)",
    "getAgent(path[1])",
    "invoke(request)",
    "nextJob(request, path[1])",
    "heartbeatJob(request, path[1], path[3])",
    "cancelJob(path[1])",
    "finishJob(request, path[1])",
    "endConversation(path[1])",
  ]) {
    assert.match(api, new RegExp(contract.replace(/[()[\]]/g, "\\$&")));
  }
  assert.match(api, /token_hash/);
  assert.match(api, /source_handle/);
  assert.match(api, /CAPSULES/);
  assert.match(api, /getCapsule/);
  assert.match(api, /lease_expires_at/);
  assert.match(api, /cancel_requested_at/);
  assert.match(api, /loading_source/);
  assert.match(api, /starting_runtime/);
  assert.doesNotMatch(api, /source_path|session_path|transcript/);
});
