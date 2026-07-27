"use client";

import {
  ArrowDown,
  Browser,
  CheckCircle,
  ChatsCircle,
  LinkSimple,
  TerminalWindow,
  UserCircle,
} from "@phosphor-icons/react";
import { useEffect, useRef } from "react";

import { PUBLIC_UI_COPY, type PublicLanguage } from "./ui-copy.mjs";

type StoryChapter = (typeof PUBLIC_UI_COPY)[PublicLanguage]["story"][number];

function ContextVisual({
  chapter,
  language,
}: {
  chapter: StoryChapter;
  language: PublicLanguage;
}) {
  const cards = chapter.cards ?? [];
  return (
    <div className="story-visual context-visual" aria-hidden="true">
      <div className="context-field">
        {cards.map((card, index) => (
          <div className={`memory-card memory-${index + 1}`} key={card}>
            <CheckCircle weight="fill" />
            <span>{card}</span>
          </div>
        ))}
        <div className="agent-core-card">
          <div className="story-avatar">A</div>
          <div>
            <small>{language === "zh" ? "你的 Agent" : "Your Agent"}</small>
            <strong>
              {language === "zh" ? "已经准备好接着做" : "Ready to continue"}
            </strong>
          </div>
          <span className="ready-pill">
            {language === "zh" ? "就绪" : "Ready"}
          </span>
        </div>
      </div>
    </div>
  );
}

function ShareVisual({
  chapter,
  language,
}: {
  chapter: StoryChapter;
  language: PublicLanguage;
}) {
  const destinations = chapter.destinations ?? [];
  return (
    <div className="story-visual share-visual" aria-hidden="true">
      <div className="share-origin">
        <div className="story-avatar">A</div>
        <div>
          <small>{language === "zh" ? "已分享" : "Shared"}</small>
          <strong>Research Agent</strong>
        </div>
      </div>
      <div className="share-link-chip">
        <LinkSimple />
        <span>aaas…/a/agt_14b2</span>
      </div>
      <div className="destination-list">
        {destinations.map((destination, index) => (
          <div className={`destination-card destination-${index + 1}`} key={destination}>
            {index === 0 ? <Browser /> : <TerminalWindow />}
            <span>{destination}</span>
            <CheckCircle weight="fill" />
          </div>
        ))}
      </div>
    </div>
  );
}

function ConversationVisual({
  chapter,
  language,
}: {
  chapter: StoryChapter;
  language: PublicLanguage;
}) {
  const conversations = chapter.conversations ?? [];
  return (
    <div className="story-visual conversation-visual" aria-hidden="true">
      <div className="conversation-source">
        <div className="story-avatar">A</div>
        <div>
          <small>{language === "zh" ? "同一个 Agent" : "The same Agent"}</small>
          <strong>Strategy Agent</strong>
        </div>
        <span className="source-state">
          {language === "zh" ? "保持原样" : "Unchanged"}
        </span>
      </div>
      <div className="conversation-pair">
        {conversations.map((conversation, index) => (
          <div className={`conversation-card conversation-${index + 1}`} key={conversation}>
            <div className="conversation-person">
              {index === 0 ? <UserCircle weight="fill" /> : <ChatsCircle weight="fill" />}
              <strong>{conversation}</strong>
            </div>
            <div className="conversation-bubble">
              {index === 0
                ? language === "zh"
                  ? "帮我把方案收敛成三步。"
                  : "Turn the plan into three steps."
                : language === "zh"
                  ? "换一个面向客户的版本。"
                  : "Make a client-facing version."}
            </div>
            <span>{language === "zh" ? "只属于我" : "Mine"}</span>
          </div>
        ))}
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
    const scenes = Array.from(root.querySelectorAll<HTMLElement>(".story-scene"));
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let frame = 0;

    const update = () => {
      frame = 0;
      const viewport = window.innerHeight;
      for (const scene of scenes) {
        const rect = scene.getBoundingClientRect();
        const travel = Math.max(rect.height - viewport * 0.5, 1);
        const progress = Math.min(
          1,
          Math.max(0, (viewport * 0.72 - rect.top) / travel),
        );
        scene.style.setProperty("--story-progress", String(progress));
        scene.dataset.phase = reducedMotion.matches
          ? "complete"
          : progress < 0.25
            ? "start"
            : progress < 0.68
              ? "middle"
              : "complete";
      }
    };

    const requestUpdate = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", requestUpdate, { passive: true });
    window.addEventListener("resize", requestUpdate);
    reducedMotion.addEventListener("change", requestUpdate);
    return () => {
      window.removeEventListener("scroll", requestUpdate);
      window.removeEventListener("resize", requestUpdate);
      reducedMotion.removeEventListener("change", requestUpdate);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [language]);

  return (
    <section className="narrative" ref={rootRef} aria-labelledby="story-title">
      <header className="story-intro">
        <span>{copy.home.storyEyebrow}</span>
        <h2 id="story-title">{copy.home.storyTitle}</h2>
        <ArrowDown aria-hidden="true" />
      </header>

      {copy.story.map((chapter, index) => (
        <article
          className={`story-scene story-scene-${index + 1}`}
          data-phase="start"
          key={chapter.number}
        >
          <div className="story-sticky">
            <div className="story-copy">
              <span className="story-number">{chapter.number}</span>
              <h3>{chapter.title}</h3>
              <p>{chapter.body}</p>
              <strong className="story-outcome">{chapter.action}</strong>
            </div>
            {index === 0 ? (
              <ContextVisual chapter={chapter} language={language} />
            ) : index === 1 ? (
              <ShareVisual chapter={chapter} language={language} />
            ) : (
              <ConversationVisual chapter={chapter} language={language} />
            )}
          </div>
        </article>
      ))}
    </section>
  );
}
