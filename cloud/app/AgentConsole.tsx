"use client";

import {
  ArrowDown,
  ArrowRight,
  CheckCircle,
  Copy,
  PaperPlaneTilt,
  Plus,
  SpinnerGap,
} from "@phosphor-icons/react";
import Image from "next/image";
import Link from "next/link";
import {
  FormEvent,
  KeyboardEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import { MessageMarkdown } from "./MessageMarkdown.mjs";
import { NarrativeStory } from "./NarrativeStory";
import { AgentLinkInstructions } from "./agent-link.mjs";
import { PUBLIC_UI_COPY, type PublicLanguage } from "./ui-copy.mjs";

type Agent = {
  id: string;
  versionId: string;
  name: string;
  description: string;
  provider: string;
  executionMode: string;
  status: string;
  availability: "online" | "offline";
};

type Message = { role: "user" | "assistant"; content: string };
type Job = {
  id: string;
  status: "queued" | "claimed" | "completed" | "failed" | "cancelled";
  stage:
    | "queued"
    | "claimed"
    | "loading_source"
    | "starting_runtime"
    | "running"
    | "finalizing"
    | "completed"
    | "failed"
    | "cancelled";
  runnerAvailability: "online" | "offline";
  output?: string;
  error?: string;
  cancelRequestedAt?: string;
};

const wait = (milliseconds: number) =>
  new Promise((resolve) => setTimeout(resolve, milliseconds));

const JOB_COPY = {
  zh: {
    ready: "准备开始",
    queuedOffline: "执行端暂时离线，恢复后会继续",
    queued: "已收到，等待开始",
    cancelled: "已取消",
    failed: "执行失败",
    completed: "已完成",
    cancelling: "正在取消",
    claimed: "已接单，正在准备",
    loading_source: "正在载入已有背景",
    starting_runtime: "正在建立你的独立对话",
    running: "正在处理你的任务",
    finalizing: "正在整理可用结果",
  },
  en: {
    ready: "Ready",
    queuedOffline: "The Runner is offline; work will continue when it returns",
    queued: "Received — waiting to start",
    cancelled: "Cancelled",
    failed: "Run failed",
    completed: "Completed",
    cancelling: "Cancelling",
    claimed: "Accepted — getting ready",
    loading_source: "Loading the existing context",
    starting_runtime: "Creating your private conversation",
    running: "Working on your task",
    finalizing: "Turning the work into a useful result",
  },
} as const;

function describeJob(job: Job | null, language: PublicLanguage) {
  const copy = JOB_COPY[language];
  if (!job) return copy.ready;
  if (job.status === "queued" && job.runnerAvailability === "offline") {
    return copy.queuedOffline;
  }
  if (job.status === "queued") return copy.queued;
  if (job.status === "cancelled") return copy.cancelled;
  if (job.status === "failed") return copy.failed;
  if (job.status === "completed") return copy.completed;
  if (job.cancelRequestedAt) return copy.cancelling;
  const stages: Record<Job["stage"], string> = {
    queued: copy.queued,
    claimed: copy.claimed,
    loading_source: copy.loading_source,
    starting_runtime: copy.starting_runtime,
    running: copy.running,
    finalizing: copy.finalizing,
    completed: copy.completed,
    failed: copy.failed,
    cancelled: copy.cancelled,
  };
  return stages[job.stage] ?? copy.claimed;
}

function LanguageToggle({
  language,
  onChange,
}: {
  language: PublicLanguage;
  onChange: () => void;
}) {
  const copy = PUBLIC_UI_COPY[language];
  return (
    <button
      className="language-toggle"
      type="button"
      onClick={onChange}
      aria-label={copy.nav.switchLanguage}
    >
      <span className={language === "zh" ? "active" : ""}>中</span>
      <i />
      <span className={language === "en" ? "active" : ""}>EN</span>
    </button>
  );
}

function SiteNav({
  language,
  onLanguageChange,
  shareView,
  onSwitchAgent,
}: {
  language: PublicLanguage;
  onLanguageChange: () => void;
  shareView: boolean;
  onSwitchAgent?: () => void;
}) {
  const copy = PUBLIC_UI_COPY[language];
  return (
    <>
      <a className="skip-link" href="#main-content">
        {copy.nav.skipToContent}
      </a>
      <header className="site-nav">
        <Link className="brand" href="/" aria-label="Codex Sharing home">
          <Image
            src="/codex-sharing-mark.png"
            width={32}
            height={32}
            alt=""
            priority
            unoptimized
          />
          <span>{copy.nav.product}</span>
        </Link>
        <div className="nav-actions">
          {shareView ? (
            <button className="switch-agent" type="button" onClick={onSwitchAgent}>
              {copy.share.switchAgent}
            </button>
          ) : (
            <a className="nav-use-agent" href="#agent-entry">
              {copy.nav.useAgent}
            </a>
          )}
          <LanguageToggle language={language} onChange={onLanguageChange} />
        </div>
      </header>
    </>
  );
}

function AgentLookup({
  language,
  agentId,
  lookupError,
  busy,
  onAgentIdChange,
  onSubmit,
  variant = "hero",
}: {
  language: PublicLanguage;
  agentId: string;
  lookupError: string;
  busy: boolean;
  onAgentIdChange: (id: string) => void;
  onSubmit: () => void;
  variant?: "hero" | "closing";
}) {
  const copy = PUBLIC_UI_COPY[language].home;
  const inputId = variant === "hero" ? "agent-id" : "closing-agent-id";

  return (
    <form
      className={`agent-lookup agent-lookup-${variant}`}
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
      noValidate
    >
      <div className="lookup-label-row">
        <label htmlFor={inputId}>{copy.agentIdLabel}</label>
        <span>{copy.agentIdHelper}</span>
      </div>
      <div className="lookup-control">
        <input
          id={inputId}
          value={agentId}
          onChange={(event) => onAgentIdChange(event.target.value)}
          placeholder={copy.agentIdPlaceholder}
          spellCheck={false}
          autoComplete="off"
          aria-describedby={`${inputId}-helper ${inputId}-error`}
          aria-invalid={Boolean(lookupError)}
        />
        <button type="submit" disabled={busy || !agentId.trim()}>
          {busy ? (
            <SpinnerGap className="spinner" aria-hidden="true" />
          ) : (
            <ArrowRight aria-hidden="true" />
          )}
          <span>{busy ? copy.openingAgent : copy.openAgent}</span>
        </button>
      </div>
      <div className="lookup-foot">
        <span id={`${inputId}-helper`}>{copy.missingId}</span>
        <span
          className="lookup-error"
          id={`${inputId}-error`}
          role={lookupError ? "alert" : undefined}
          aria-live="polite"
        >
          {lookupError}
        </span>
      </div>
    </form>
  );
}

function HomeExperience({
  language,
  agentId,
  lookupError,
  lookupBusy,
  onAgentIdChange,
  onFindAgent,
}: {
  language: PublicLanguage;
  agentId: string;
  lookupError: string;
  lookupBusy: boolean;
  onAgentIdChange: (id: string) => void;
  onFindAgent: () => void;
}) {
  const copy = PUBLIC_UI_COPY[language];
  return (
    <>
      <section className="cinematic-hero" id="agent-entry">
        <div className="hero-content">
          <span className="hero-eyebrow">{copy.home.eyebrow}</span>
          <h1>{copy.home.title}</h1>
          <p>{copy.home.description}</p>
          <AgentLookup
            language={language}
            agentId={agentId}
            lookupError={lookupError}
            busy={lookupBusy}
            onAgentIdChange={onAgentIdChange}
            onSubmit={onFindAgent}
          />
          <a className="story-link" href="#story-title">
            <span>{copy.home.storyEyebrow}</span>
            <ArrowDown aria-hidden="true" />
          </a>
        </div>
        <div className="hero-agent-preview" aria-hidden="true">
          <header>
            <div className="story-avatar">A</div>
            <div>
              <small>{language === "zh" ? "已有理解，可以复用" : "Context ready to reuse"}</small>
              <strong>Research Agent</strong>
            </div>
            <span>{language === "zh" ? "在线" : "Ready"}</span>
          </header>
          {copy.story[0].cards?.slice(0, 3).map((item) => (
            <div className="preview-row" key={item}>
              <CheckCircle weight="fill" />
              <span>{item}</span>
            </div>
          ))}
        </div>
      </section>

      <NarrativeStory language={language} />

      <section className="closing-cta" aria-labelledby="closing-title">
        <div>
          <span>{copy.home.eyebrow}</span>
          <h2 id="closing-title">{copy.home.closingTitle}</h2>
          <p>{copy.home.closingBody}</p>
          <a
            className="publisher-link"
            href="https://github.com/Equality-Machine/agent-as-a-service#publish-your-own-agent"
            target="_blank"
            rel="noreferrer"
          >
            <span>{copy.home.publisherCta}</span>
            <ArrowRight aria-hidden="true" />
          </a>
        </div>
        <AgentLookup
          language={language}
          agentId={agentId}
          lookupError={lookupError}
          busy={lookupBusy}
          onAgentIdChange={onAgentIdChange}
          onSubmit={onFindAgent}
          variant="closing"
        />
      </section>
    </>
  );
}

function ShareLoading({
  language,
  agentId,
  lookupError,
  onRetry,
  onSwitchAgent,
}: {
  language: PublicLanguage;
  agentId: string;
  lookupError: string;
  onRetry: () => void;
  onSwitchAgent: () => void;
}) {
  const copy = PUBLIC_UI_COPY[language].share;
  return (
    <main className="share-loading" id="main-content">
      <SpinnerGap className="spinner" aria-hidden="true" />
      <h1>{lookupError || copy.loading}</h1>
      <p>{agentId}</p>
      {lookupError ? (
        <div>
          <button type="button" onClick={onRetry}>
            {language === "zh" ? "重试" : "Try again"}
          </button>
          <button type="button" onClick={onSwitchAgent}>
            {copy.switchAgent}
          </button>
        </div>
      ) : null}
    </main>
  );
}

function AgentExperience({
  language,
  agent,
  conversationId,
  messages,
  input,
  busy,
  currentJob,
  copied,
  onCopyAgentId,
  onInputChange,
  onSubmit,
  onCancel,
  onNewConversation,
}: {
  language: PublicLanguage;
  agent: Agent;
  conversationId: string;
  messages: Message[];
  input: string;
  busy: boolean;
  currentJob: Job | null;
  copied: boolean;
  onCopyAgentId: () => void;
  onInputChange: (value: string) => void;
  onSubmit: (event: FormEvent) => void;
  onCancel: () => void;
  onNewConversation: () => void;
}) {
  const copy = PUBLIC_UI_COPY[language].share;
  const chatEnd = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEnd.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [messages, busy, currentJob]);

  const handleComposerKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      event.currentTarget.form?.requestSubmit();
    }
  };

  return (
    <main className="shared-agent-main" id="main-content">
      <section className="agent-hero-band">
        <div className="agent-profile">
          <span className="hero-eyebrow">{copy.eyebrow}</span>
          <h1>{agent.name}</h1>
          <p>{agent.description || copy.descriptionFallback}</p>
          <div className="agent-identity-row">
            <span className={`availability availability-${agent.availability}`}>
              <i />
              {agent.availability === "online" ? copy.online : copy.offline}
            </span>
            <button type="button" onClick={onCopyAgentId} className="copy-agent-id">
              <Copy aria-hidden="true" />
              <span>{agent.id}</span>
              <strong>{copied ? copy.copied : copy.copyAgentId}</strong>
            </button>
          </div>
        </div>
      </section>

      <section className="conversation-shell" aria-labelledby="conversation-title">
        <header className="conversation-heading">
          <div>
            <span>{copy.privateNote}</span>
            <h2 id="conversation-title">{copy.promptLabel}</h2>
            <p>{copy.promptHelper}</p>
          </div>
          <button
            className="new-conversation"
            type="button"
            onClick={onNewConversation}
            disabled={busy}
          >
            <Plus aria-hidden="true" />
            <span>{copy.newConversation}</span>
          </button>
        </header>

        <div className="messages" aria-live="polite" aria-busy={busy}>
          {messages.length === 0 ? (
            <div className="empty-chat">
              <div className="empty-chat-icon">
                <PaperPlaneTilt weight="duotone" aria-hidden="true" />
              </div>
              <strong>{copy.emptyTitle}</strong>
              <p>{copy.emptyBody}</p>
            </div>
          ) : (
            messages.map((message, index) => (
              <div className={`message ${message.role}`} key={`${index}-${message.role}`}>
                <span>{message.role === "user" ? (language === "zh" ? "你" : "You") : "A"}</span>
                <MessageMarkdown content={message.content} />
              </div>
            ))
          )}
          {busy && messages.length > 0 ? (
            <div className="message assistant">
              <span>A</span>
              <div className="job-progress">
                <div>
                  <i className={`job-dot ${currentJob?.status ?? "queued"}`} />
                  <strong>{describeJob(currentJob, language)}</strong>
                </div>
                <small>{currentJob?.stage ?? "queued"}</small>
                <button type="button" onClick={onCancel}>
                  {copy.cancel}
                </button>
              </div>
            </div>
          ) : null}
          <div ref={chatEnd} />
        </div>

        <form className="composer" onSubmit={onSubmit}>
          <label htmlFor="agent-message" className="sr-only">
            {copy.promptLabel}
          </label>
          <textarea
            id="agent-message"
            value={input}
            disabled={busy}
            onChange={(event) => onInputChange(event.target.value)}
            onKeyDown={handleComposerKeyDown}
            placeholder={copy.promptPlaceholder}
            rows={2}
          />
          <button disabled={busy || !input.trim()} aria-label={copy.send}>
            {busy ? (
              <SpinnerGap className="spinner" aria-hidden="true" />
            ) : (
              <PaperPlaneTilt weight="fill" aria-hidden="true" />
            )}
            <span>{copy.send}</span>
          </button>
        </form>
        <footer className="conversation-footer">
          <span>{copy.privateNote}</span>
          <span>
            {conversationId
              ? `${copy.agentIdLabel}: ${agent.id} · ${conversationId}`
              : copy.notStarted}
          </span>
        </footer>
      </section>

      <AgentLinkInstructions agentId={agent.id} language={language} />
    </main>
  );
}

export function AgentConsole({ initialAgentId = "" }: { initialAgentId?: string }) {
  const [language, setLanguage] = useState<PublicLanguage>("zh");
  const [agentId, setAgentId] = useState(initialAgentId);
  const [agent, setAgent] = useState<Agent | null>(null);
  const [lookupError, setLookupError] = useState("");
  const [lookupBusy, setLookupBusy] = useState(Boolean(initialAgentId));
  const [conversationId, setConversationId] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [currentJobId, setCurrentJobId] = useState("");
  const [currentJob, setCurrentJob] = useState<Job | null>(null);
  const [copied, setCopied] = useState(false);

  const copy = PUBLIC_UI_COPY[language].share;

  const findAgent = useCallback(async (id: string, updateHistory = true) => {
    const cleanId = id.trim();
    if (!cleanId) return;
    setLookupError("");
    setLookupBusy(true);
    try {
      const response = await fetch(`/api/v1/agents/${encodeURIComponent(cleanId)}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Agent not found");
      setAgentId(cleanId);
      setAgent(data.agent);
      setConversationId("");
      setMessages([]);
      setCurrentJob(null);
      if (updateHistory) {
        window.history.pushState({}, "", `/a/${encodeURIComponent(cleanId)}`);
      }
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (error) {
      setAgent(null);
      setLookupError((error as Error).message);
    } finally {
      setLookupBusy(false);
    }
  }, []);

  useEffect(() => {
    const saved = window.localStorage.getItem("aaas-language");
    const preferred =
      saved === "zh" || saved === "en"
        ? saved
        : navigator.language.toLowerCase().startsWith("zh")
          ? "zh"
          : "en";
    setLanguage(preferred);
  }, []);

  useEffect(() => {
    const id =
      initialAgentId ||
      new URLSearchParams(window.location.search).get("agent") ||
      "";
    if (id) void findAgent(id, false);
    else setLookupBusy(false);
  }, [findAgent, initialAgentId]);

  useEffect(() => {
    const onPopState = () => {
      const match = window.location.pathname.match(/^\/a\/([^/]+)$/);
      if (match) {
        const id = decodeURIComponent(match[1]);
        setAgentId(id);
        void findAgent(id, false);
      } else {
        setAgent(null);
        setAgentId("");
        setLookupError("");
        setConversationId("");
        setMessages([]);
      }
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [findAgent]);

  const toggleLanguage = () => {
    const next = language === "zh" ? "en" : "zh";
    setLanguage(next);
    window.localStorage.setItem("aaas-language", next);
    document.documentElement.lang = next === "zh" ? "zh-CN" : "en";
  };

  async function submit(event: FormEvent) {
    event.preventDefault();
    const prompt = input.trim();
    if (!agent || !prompt || busy) return;
    setInput("");
    setMessages((current) => [...current, { role: "user", content: prompt }]);
    setBusy(true);
    setCurrentJob(null);
    let lastJob: Job | null = null;
    try {
      const response = await fetch("/api/v1/invoke", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(
          conversationId
            ? { conversationId, input: prompt }
            : { agentId: agent.id, input: prompt },
        ),
      });
      const queued = await response.json();
      if (!response.ok) throw new Error(queued.error ?? "Unable to invoke agent");
      setConversationId(queued.conversationId);
      setCurrentJobId(queued.jobId);
      lastJob = {
        id: queued.jobId,
        status: "queued",
        stage: "queued",
        runnerAvailability: agent.availability,
      };
      setCurrentJob(lastJob);

      for (let attempt = 0; attempt < 750; attempt += 1) {
        await wait(800);
        const jobResponse = await fetch(`/api/v1/jobs/${queued.jobId}`);
        const jobData = await jobResponse.json();
        if (!jobResponse.ok) {
          throw new Error(jobData.error ?? "Unable to read job status");
        }
        lastJob = jobData.job as Job;
        setCurrentJob(lastJob);
        if (lastJob.status === "completed") {
          setMessages((current) => [
            ...current,
            { role: "assistant", content: lastJob?.output ?? "" },
          ]);
          return;
        }
        if (lastJob.status === "failed") {
          throw new Error(lastJob.error ?? "Agent execution failed");
        }
        if (lastJob.status === "cancelled") {
          setMessages((current) => [
            ...current,
            { role: "assistant", content: copy.cancelled },
          ]);
          return;
        }
      }
      await fetch(`/api/v1/jobs/${queued.jobId}/cancel`, { method: "POST" });
      throw new Error(
        language === "zh"
          ? `等待超过 10 分钟，已请求取消；最后状态：${describeJob(lastJob, language)}`
          : `The wait exceeded 10 minutes, so cancellation was requested. Last status: ${describeJob(lastJob, language)}`,
      );
    } catch (error) {
      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          content: `${copy.callFailed} (${describeJob(lastJob, language)}): ${(error as Error).message}`,
        },
      ]);
    } finally {
      setBusy(false);
      setCurrentJobId("");
    }
  }

  async function cancelCurrentJob() {
    if (!currentJobId) return;
    const response = await fetch(
      `/api/v1/jobs/${encodeURIComponent(currentJobId)}/cancel`,
      { method: "POST" },
    );
    const result = await response.json();
    if (!response.ok) {
      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          content: `${copy.cancelFailed}: ${result.error ?? "Unknown error"}`,
        },
      ]);
      return;
    }
    setCurrentJob((job) =>
      job
        ? {
            ...job,
            status: result.status,
            stage: result.status === "cancelled" ? "cancelled" : job.stage,
            cancelRequestedAt: new Date().toISOString(),
          }
        : job,
    );
  }

  async function newConversation() {
    if (currentJobId) await cancelCurrentJob();
    if (conversationId) {
      await fetch(`/api/v1/conversations/${conversationId}/end`, {
        method: "POST",
      });
    }
    setConversationId("");
    setMessages([]);
    setCurrentJob(null);
    setInput("");
  }

  async function switchAgent() {
    await newConversation();
    setAgent(null);
    setAgentId("");
    setLookupError("");
    window.history.pushState({}, "", "/");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function copyAgentId() {
    if (!agent) return;
    await navigator.clipboard.writeText(agent.id);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  const shareView = Boolean(initialAgentId || agent);

  return (
    <>
      <SiteNav
        language={language}
        onLanguageChange={toggleLanguage}
        shareView={shareView}
        onSwitchAgent={() => void switchAgent()}
      />
      {agent ? (
        <AgentExperience
          language={language}
          agent={agent}
          conversationId={conversationId}
          messages={messages}
          input={input}
          busy={busy}
          currentJob={currentJob}
          copied={copied}
          onCopyAgentId={() => void copyAgentId()}
          onInputChange={setInput}
          onSubmit={submit}
          onCancel={() => void cancelCurrentJob()}
          onNewConversation={() => void newConversation()}
        />
      ) : shareView ? (
        <ShareLoading
          language={language}
          agentId={agentId}
          lookupError={lookupError}
          onRetry={() => void findAgent(agentId, false)}
          onSwitchAgent={() => void switchAgent()}
        />
      ) : (
        <main id="main-content">
          <HomeExperience
            language={language}
            agentId={agentId}
            lookupError={lookupError}
            lookupBusy={lookupBusy}
            onAgentIdChange={setAgentId}
            onFindAgent={() => void findAgent(agentId)}
          />
        </main>
      )}
    </>
  );
}
