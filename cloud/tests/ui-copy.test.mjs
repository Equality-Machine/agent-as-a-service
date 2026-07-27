import assert from "node:assert/strict";
import test from "node:test";

import { PUBLIC_UI_COPY } from "../app/ui-copy.mjs";

const flattenStrings = (value) => {
  if (typeof value === "string") return [value];
  if (Array.isArray(value)) return value.flatMap(flattenStrings);
  if (value && typeof value === "object") {
    return Object.values(value).flatMap(flattenStrings);
  }
  return [];
};

test("public UI copy tells the Agent story in Chinese and English", () => {
  assert.equal(PUBLIC_UI_COPY.zh.home.agentIdLabel, "输入 Agent ID");
  assert.equal(PUBLIC_UI_COPY.en.home.agentIdLabel, "Enter Agent ID");
  assert.match(PUBLIC_UI_COPY.zh.home.title, /找到 Agent/);
  assert.match(PUBLIC_UI_COPY.en.home.title, /Find the Agent/);
  assert.equal(PUBLIC_UI_COPY.zh.story.length, 3);
  assert.equal(PUBLIC_UI_COPY.en.story.length, 3);
  assert.match(PUBLIC_UI_COPY.zh.share.promptLabel, /想让它做什么/);
  assert.match(PUBLIC_UI_COPY.en.share.promptLabel, /like it to do/);
});

test("public-facing story copy avoids implementation jargon", () => {
  const publicCopy = flattenStrings(PUBLIC_UI_COPY).join("\n");
  for (const phrase of [
    "冻结发布",
    "独立 Fork",
    "云端中转",
    "一个 ID，继续使用",
    "AgentVersion",
    "Job/Lease",
  ]) {
    assert.doesNotMatch(publicCopy, new RegExp(phrase));
  }
});
