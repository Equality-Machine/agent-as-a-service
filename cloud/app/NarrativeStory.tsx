"use client";

import {
  ArrowDown,
  Browser,
  Check,
  LinkSimple,
  LockKey,
  TerminalWindow,
  UserCircle,
} from "@phosphor-icons/react";
import { useEffect, useRef } from "react";

import { PUBLIC_UI_COPY, type PublicLanguage } from "./ui-copy.mjs";

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));
const ease = (value: number) => {
  const t = clamp01(value);
  return t * t * (3 - 2 * t);
};

function ConversationDemo({ language }: { language: PublicLanguage }) {
  return (
    <div className="story-view story-conversation">
      <header className="demo-agent-heading">
        <span className="demo-agent-avatar">A</span>
        <div>
          <small>{language === "zh" ? "研究与决策" : "Research & decisions"}</small>
          <strong>Research Agent</strong>
        </div>
        <span className="demo-ready">
          <i />
          {language === "zh" ? "已准备好" : "Ready"}
        </span>
      </header>

      <div className="demo-history">
        <span>{language === "zh" ? "此前已经完成" : "Work already completed"}</span>
        <p>
          {language === "zh"
            ? "已梳理目标、约束、关键证据与判断标准。"
            : "Goals, constraints, evidence, and decision criteria are already clear."}
        </p>
        <p>
          {language === "zh"
            ? "已确认：优先给结论，再说明风险。"
            : "Agreed: lead with the decision, then explain the risks."}
        </p>
      </div>

      <div className="demo-context-line">
        <Check weight="bold" />
        <span>
          {language === "zh"
            ? "这些背景已经在这里"
            : "The background is already here"}
        </span>
      </div>

      <div className="demo-user-message">
        {language === "zh"
          ? "把这份研究收敛成三条决策建议。"
          : "Turn this research into three decisions."}
      </div>

      <div className="demo-answer">
        <span className="demo-agent-avatar">A</span>
        <div>
          <p>
            {language === "zh"
              ? "建议现在做这三件事："
              : "Here are the three decisions to make now:"}
          </p>
          <ol>
            <li>{language === "zh" ? "先验证最关键的需求" : "Validate the critical need first"}</li>
            <li>{language === "zh" ? "把交付范围缩到一周" : "Cut the delivery scope to one week"}</li>
            <li>{language === "zh" ? "保留人工确认这一步" : "Keep human approval in the loop"}</li>
          </ol>
        </div>
      </div>
    </div>
  );
}

function DestinationsDemo({ language }: { language: PublicLanguage }) {
  const destinations = [
    {
      icon: <Browser weight="duotone" />,
      name: language === "zh" ? "网页" : "Web",
      detail: language === "zh" ? "打开链接，直接开始" : "Open the link and start",
    },
    {
      icon: <TerminalWindow weight="duotone" />,
      name: "Codex",
      detail: language === "zh" ? "粘贴链接，说出任务" : "Paste the link, then give the task",
    },
    {
      icon: <TerminalWindow weight="duotone" />,
      name: "Claude Code",
      detail: language === "zh" ? "同一个链接，同样能继续" : "The same link carries the work",
    },
  ];

  return (
    <div className="story-view story-destinations">
      <div className="handoff-heading">
        <small>{language === "zh" ? "一个链接就够了" : "One link is enough"}</small>
        <div className="handoff-url">
          <LinkSimple weight="bold" />
          <span>aaas…/a/agt_14b2806758a042db</span>
          <Check weight="bold" />
        </div>
      </div>

      <div className="destination-workspace">
        {destinations.map((destination, index) => (
          <div className={`destination-surface destination-surface-${index + 1}`} key={destination.name}>
            <span>{destination.icon}</span>
            <div>
              <strong>{destination.name}</strong>
              <small>{destination.detail}</small>
            </div>
            <i>{language === "zh" ? "可用" : "Ready"}</i>
          </div>
        ))}
      </div>

      <p className="handoff-result">
        {language === "zh"
          ? "对方不需要先读另一份背景说明。"
          : "No separate background document required."}
      </p>
    </div>
  );
}

function BranchesDemo({ language }: { language: PublicLanguage }) {
  return (
    <div className="story-view story-branches">
      <header className="branch-source">
        <div>
          <span className="demo-agent-avatar">A</span>
          <strong>Strategy Agent</strong>
        </div>
        <span>
          <LockKey weight="fill" />
          {language === "zh" ? "发布者的工作保持原样" : "Publisher's work stays unchanged"}
        </span>
      </header>

      <div className="branch-conversations">
        <section>
          <header>
            <UserCircle weight="fill" />
            <span>{language === "zh" ? "我的对话" : "My conversation"}</span>
          </header>
          <p className="branch-prompt">
            {language === "zh"
              ? "把结论写成明天会议能用的一页。"
              : "Turn the decisions into a page for tomorrow's meeting."}
          </p>
          <div className="branch-answer">
            <strong>{language === "zh" ? "会议一页纸" : "Meeting one-pager"}</strong>
            <span>{language === "zh" ? "目标 · 三项决策 · 最大风险" : "Goal · 3 decisions · top risk"}</span>
          </div>
          <small>
            <LockKey weight="fill" />
            {language === "zh" ? "只属于这段对话" : "Private to this conversation"}
          </small>
        </section>

        <section>
          <header>
            <UserCircle weight="fill" />
            <span>{language === "zh" ? "同事的对话" : "Teammate's conversation"}</span>
          </header>
          <p className="branch-prompt">
            {language === "zh"
              ? "改写成给客户看的方案。"
              : "Rewrite this as a client-facing proposal."}
          </p>
          <div className="branch-answer">
            <strong>{language === "zh" ? "客户方案" : "Client proposal"}</strong>
            <span>{language === "zh" ? "现状 · 建议 · 下一步" : "Situation · proposal · next step"}</span>
          </div>
          <small>
            <LockKey weight="fill" />
            {language === "zh" ? "与你的内容互不影响" : "Independent from your work"}
          </small>
        </section>
      </div>
    </div>
  );
}

export function NarrativeStory({ language }: { language: PublicLanguage }) {
  const rootRef = useRef<HTMLElement>(null);
  const copy = PUBLIC_UI_COPY[language];

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let frame = 0;
    let isVisible = false;

    const update = () => {
      frame = 0;
      const scroll = root.querySelector<HTMLElement>(".story-scroll");
      if (!scroll) return;
      const rect = scroll.getBoundingClientRect();
      const travel = Math.max(scroll.offsetHeight - window.innerHeight, 1);
      const progress = clamp01(-rect.top / travel);

      const sceneOne = 1 - ease((progress - 0.27) / 0.05);
      const sceneTwo =
        ease((progress - 0.33) / 0.05) *
        (1 - ease((progress - 0.58) / 0.05));
      const sceneThree = ease((progress - 0.64) / 0.05);
      const contextReady = ease((progress - 0.035) / 0.11);
      const taskReady = ease((progress - 0.11) / 0.06);
      const answerReady = ease((progress - 0.17) / 0.09);
      const shareReady = ease((progress - 0.38) / 0.07);
      const destinationOne = ease((progress - 0.42) / 0.045);
      const destinationTwo = ease((progress - 0.465) / 0.045);
      const destinationThree = ease((progress - 0.51) / 0.045);
      const branchesReady = ease((progress - 0.69) / 0.1);

      root.dataset.storyAct =
        progress < 0.31 ? "0" : progress < 0.63 ? "1" : "2";
      root.style.setProperty("--story-progress", progress.toFixed(4));
      root.style.setProperty("--scene-one", sceneOne.toFixed(4));
      root.style.setProperty("--scene-two", sceneTwo.toFixed(4));
      root.style.setProperty("--scene-three", sceneThree.toFixed(4));
      root.style.setProperty("--context-ready", contextReady.toFixed(4));
      root.style.setProperty("--task-ready", taskReady.toFixed(4));
      root.style.setProperty("--answer-ready", answerReady.toFixed(4));
      root.style.setProperty("--share-ready", shareReady.toFixed(4));
      root.style.setProperty("--destination-one", destinationOne.toFixed(4));
      root.style.setProperty("--destination-two", destinationTwo.toFixed(4));
      root.style.setProperty("--destination-three", destinationThree.toFixed(4));
      root.style.setProperty("--branches-ready", branchesReady.toFixed(4));
      root.style.setProperty("--backdrop-x", `${50 + progress * 8}%`);
    };

    const requestUpdate = () => {
      if (!isVisible || frame) return;
      frame = window.requestAnimationFrame(update);
    };

    const visibilityObserver = new IntersectionObserver(
      ([entry]) => {
        isVisible = entry.isIntersecting;
        if (isVisible) {
          update();
        } else if (frame) {
          window.cancelAnimationFrame(frame);
          frame = 0;
        }
      },
      { rootMargin: "20% 0px" },
    );
    visibilityObserver.observe(root);

    window.addEventListener("scroll", requestUpdate, { passive: true });
    window.addEventListener("resize", requestUpdate);
    reducedMotion.addEventListener("change", requestUpdate);
    update();

    return () => {
      window.removeEventListener("scroll", requestUpdate);
      window.removeEventListener("resize", requestUpdate);
      reducedMotion.removeEventListener("change", requestUpdate);
      visibilityObserver.disconnect();
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [language]);

  const trustItems =
    language === "zh"
      ? [
          ["原来的工作不会被改动", "发布出去之后，原会话仍保持原样。"],
          ["每个人拥有自己的对话", "你的追问、文件和结果不会进入别人的使用过程。"],
          ["随时可以重新开始", "新建一次对话，就从同一个 Agent 重新出发。"],
        ]
      : [
          ["The original work stays unchanged", "Publishing does not rewrite the source session."],
          ["Every person gets a private conversation", "Your prompts, files, and results never enter someone else's work."],
          ["Start fresh whenever you need", "Open a new conversation and begin again with the same Agent."],
        ];

  return (
    <section
      className="narrative story-journey"
      ref={rootRef}
      data-story-act="0"
      aria-labelledby="story-title"
    >
      <header className="story-intro">
        <span>{copy.home.storyEyebrow}</span>
        <h2 id="story-title">{copy.home.storyTitle}</h2>
        <p>
          {language === "zh"
            ? "向下滚动，看一次交接如何变成真正的继续。"
            : "Scroll to see a handoff become real momentum."}
        </p>
        <ArrowDown aria-hidden="true" />
      </header>

      <div className="story-scroll">
        <div className="story-stage">
          <div className="story-backdrop" aria-hidden="true" />

          <div className="story-copy-stack">
            {copy.story.map((chapter, index) => (
              <article className={`story-chapter story-chapter-${index + 1}`} key={chapter.number}>
                <span className="story-number">{chapter.number}</span>
                <h3>{chapter.title}</h3>
                <p>{chapter.body}</p>
                <strong className="story-outcome">
                  <Check weight="bold" />
                  {chapter.action}
                </strong>
              </article>
            ))}
          </div>

          <div className="story-product-stage" aria-hidden="true">
            <div className="story-product-shell">
              <div className="story-browser-bar">
                <span>
                  <i />
                  <i />
                  <i />
                </span>
                <div>
                  <LinkSimple />
                  aaas-agent-service…/a/agt_14b2
                </div>
                <strong>AaaS</strong>
              </div>
              <div className="story-product-body">
                <ConversationDemo language={language} />
                <DestinationsDemo language={language} />
                <BranchesDemo language={language} />
              </div>
            </div>
          </div>

          <div className="story-progress" aria-hidden="true">
            <i />
          </div>

          <span className="story-scroll-hint" aria-hidden="true">
            {language === "zh" ? "继续滚动" : "Keep scrolling"}
          </span>
        </div>
      </div>

      <section className="story-trust" aria-labelledby="story-trust-title">
        <header>
          <span>{language === "zh" ? "放心继续" : "CONTINUE WITH CONFIDENCE"}</span>
          <h3 id="story-trust-title">
            {language === "zh"
              ? "共享的是能力，不是彼此的内容。"
              : "Share the capability, not each other's content."}
          </h3>
        </header>
        <div className="story-trust-list">
          {trustItems.map(([title, body], index) => (
            <article key={title}>
              <span>0{index + 1}</span>
              <div>
                <h4>{title}</h4>
                <p>{body}</p>
              </div>
              <Check weight="bold" />
            </article>
          ))}
        </div>
      </section>
    </section>
  );
}
