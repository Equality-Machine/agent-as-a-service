import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

test("cloud app exposes an Agent-ID-first bilingual story and console", async () => {
  const [page, consoleSource, storySource, layout, css, packageJson] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/AgentConsole.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/NarrativeStory.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
    readFile(new URL("../package.json", import.meta.url), "utf8"),
  ]);

  assert.match(page, /<AgentConsole /);
  assert.match(consoleSource, /PUBLIC_UI_COPY/);
  assert.match(consoleSource, /agent-as-a-service#publish-your-own-agent/);
  assert.match(consoleSource, /aaas-language/);
  assert.match(consoleSource, /aria-live/);
  assert.match(consoleSource, /\/api\/v1\/agents\//);
  assert.match(consoleSource, /\/api\/v1\/invoke/);
  assert.match(consoleSource, /\/api\/v1\/jobs\/.*\/cancel/);
  assert.match(consoleSource, /queuedOffline/);
  assert.match(consoleSource, /loading_source/);
  assert.match(consoleSource, /starting_runtime/);
  assert.match(consoleSource, /正在处理你的任务/);
  assert.match(consoleSource, /MessageMarkdown/);
  assert.match(storySource, /requestAnimationFrame/);
  assert.match(storySource, /prefers-reduced-motion/);
  assert.match(storySource, /data-phase/);
  assert.match(layout, /AaaS — Agent as a Service/);
  assert.match(layout, /Skip the briefing\. Start with an Agent/);
  assert.match(css, /--accent:\s*#f26a2e/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)/);
  assert.match(packageJson, /@phosphor-icons\/react/);
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
    "getAgentManifest(request, path[1])",
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
  assert.match(api, /application\/aaas\+json/);
  assert.match(api, /shareUrl: manifest\.shareUrl/);
  assert.match(api, /manifestUrl: manifest\.manifestUrl/);
  assert.doesNotMatch(api, /source_path|session_path|transcript/);
});

test("canonical and legacy Agent links render the self-describing handoff", async () => {
  const [home, agentPage, consoleSource] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/a/[agentId]/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/AgentConsole.tsx", import.meta.url), "utf8"),
  ]);

  assert.match(home, /searchParams/);
  assert.match(home, /initialAgentId/);
  assert.match(agentPage, /generateMetadata/);
  assert.match(agentPage, /start with the actual task/);
  assert.match(agentPage, /application\/aaas\+json/);
  assert.match(agentPage, /initialAgentId=\{agentId\}/);
  assert.match(consoleSource, /AgentLinkInstructions/);
  assert.match(consoleSource, /\/a\/\$\{encodeURIComponent\(cleanId\)\}/);
});
