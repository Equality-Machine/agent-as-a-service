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
  assert.equal(PUBLIC_UI_COPY.zh.home.title, "不用重新交代。直接推进工作。");
  assert.equal(PUBLIC_UI_COPY.en.home.title, "Skip the briefing. Start the work.");
  assert.equal(
    PUBLIC_UI_COPY.zh.home.storyTitle,
    "好的协作，不该换个人就从头开始。",
  );
  assert.equal(
    PUBLIC_UI_COPY.en.home.storyTitle,
    "Great work should not restart with every handoff.",
  );
  assert.equal(PUBLIC_UI_COPY.zh.story.length, 3);
  assert.equal(PUBLIC_UI_COPY.en.story.length, 3);
  assert.equal(PUBLIC_UI_COPY.zh.share.promptLabel, "这次想让它帮你完成什么？");
  assert.equal(
    PUBLIC_UI_COPY.en.share.promptLabel,
    "What should this Agent help you finish?",
  );
  assert.equal(
    PUBLIC_UI_COPY.zh.home.publisherCta,
    "已经有一段成熟对话？把它发布成 Agent",
  );
  assert.equal(
    PUBLIC_UI_COPY.en.home.publisherCta,
    "Already have a great working session? Publish it as an Agent",
  );
  assert.equal(PUBLIC_UI_COPY.zh.nav.githubStar, "GitHub Star");
  assert.equal(PUBLIC_UI_COPY.en.nav.githubStar, "Star on GitHub");
  assert.match(PUBLIC_UI_COPY.zh.guide.consumerNote, /不需要 Runner/);
  assert.match(PUBLIC_UI_COPY.en.guide.consumerNote, /never requires a Runner/);
  assert.match(
    PUBLIC_UI_COPY.zh.guide.consumerPrompt,
    /npx -y Equality-Machine\/agent-as-a-service/,
  );
  assert.match(PUBLIC_UI_COPY.zh.guide.publisherPrompt, /征得我的确认/);
  assert.match(PUBLIC_UI_COPY.en.guide.publisherPrompt, /ask for my approval/);
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
