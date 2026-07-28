import assert from "node:assert/strict";
import { renderToStaticMarkup } from "react-dom/server";
import test from "node:test";

import {
  AgentLinkInstructions,
  buildAgentManifest,
} from "../app/agent-link.mjs";

test("an Agent link describes install, MCP, and immediate HTTP usage", () => {
  const manifest = buildAgentManifest({
    agentId: "agt_demo",
    origin: "https://agents.example",
  });

  assert.equal(manifest.kind, "aaas-agent-link");
  assert.equal(manifest.agentId, "agt_demo");
  assert.equal(manifest.shareUrl, "https://agents.example/a/agt_demo");
  assert.equal(manifest.consumer.runnerRequired, false);
  assert.equal(
    manifest.consumer.install.command,
    "npx -y Equality-Machine/agent-as-a-service",
  );
  assert.equal(manifest.consumer.install.approvalRequired, true);
  assert.deepEqual(manifest.consumer.mcp.tools, [
    "find_agent",
    "agent_start",
    "agent_continue",
    "agent_end",
  ]);
  assert.equal(manifest.consumer.http.start.body.agentId, "agt_demo");
  assert.equal(
    manifest.consumer.http.start.url,
    "https://agents.example/api/v1/invoke",
  );
  assert.match(manifest.consumer.http.poll.url, /\{jobId\}/);
});

test("an Agent share page is visibly and machine-readably self-describing", () => {
  const html = renderToStaticMarkup(
    AgentLinkInstructions({ agentId: "agt_demo" }),
  );

  assert.match(html, /data-aaas-agent-id="agt_demo"/);
  assert.match(html, /把这个链接粘贴给 Codex 或 Claude Code，就能使用/);
  assert.match(html, /npx -y Equality-Machine\/agent-as-a-service/);
  assert.match(
    html,
    /href="\/api\/v1\/agents\/agt_demo\/manifest"[^>]+type="application\/aaas\+json"/,
  );
  assert.match(html, /type="application\/aaas\+json"/);
  assert.match(html, /"runnerRequired":false/);
  assert.match(html, /把当前页面链接粘贴给 Codex 或 Claude Code/);
});

test("the visible handoff instructions support English", () => {
  const html = renderToStaticMarkup(
    AgentLinkInstructions({ agentId: "agt_demo", language: "en" }),
  );

  assert.match(html, /Paste this link into Codex or Claude Code to use the Agent/);
  assert.match(html, /never requires a Runner/);
  assert.match(html, /Use it in your coding agent/);
});
