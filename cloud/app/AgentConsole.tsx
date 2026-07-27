"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useRef, useState } from "react";

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

function describeJob(job: Job | null) {
  if (!job) return "准备调用";
  if (job.status === "queued" && job.runnerAvailability === "offline") {
    return "Runner 当前离线，任务仍在排队";
  }
  if (job.status === "queued") return "排队等待 Runner";
  if (job.status === "cancelled") return "调用已取消";
  if (job.status === "failed") return "运行时执行失败";
  if (job.status === "completed") return "执行完成";
  if (job.cancelRequestedAt) return "正在取消运行时";
  const stages: Record<Job["stage"], string> = {
    queued: "排队等待 Runner",
    claimed: "Runner 已领取任务",
    loading_source: "加载并校验 Agent 快照",
    starting_runtime: "启动隔离运行时",
    running: "Agent 执行中",
    finalizing: "保存分支结果",
    completed: "执行完成",
    failed: "运行时执行失败",
    cancelled: "调用已取消",
  };
  return stages[job.stage] ?? "Runner 已领取任务";
}

export function AgentConsole() {
  const [agentId, setAgentId] = useState("");
  const [agent, setAgent] = useState<Agent | null>(null);
  const [lookupError, setLookupError] = useState("");
  const [conversationId, setConversationId] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [currentJobId, setCurrentJobId] = useState("");
  const [currentJob, setCurrentJob] = useState<Job | null>(null);
  const chatEnd = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEnd.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, busy, currentJob]);

  const findAgent = useCallback(async (id: string) => {
    const cleanId = id.trim();
    if (!cleanId) return;
    setLookupError("");
    setBusy(true);
    try {
      const response = await fetch(`/api/v1/agents/${encodeURIComponent(cleanId)}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Agent not found");
      setAgent(data.agent);
      setConversationId("");
      setMessages([]);
      setCurrentJob(null);
      window.history.replaceState({}, "", `/?agent=${encodeURIComponent(cleanId)}`);
    } catch (error) {
      setAgent(null);
      setLookupError((error as Error).message);
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get("agent");
    if (id) {
      setAgentId(id);
      void findAgent(id);
    }
  }, [findAgent]);

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
            { role: "assistant", content: "本次调用已取消。" },
          ]);
          return;
        }
      }
      await fetch(`/api/v1/jobs/${queued.jobId}/cancel`, { method: "POST" });
      throw new Error(`等待超过 10 分钟，已请求取消；最后阶段：${describeJob(lastJob)}`);
    } catch (error) {
      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          content: `调用失败（${describeJob(lastJob)}）：${(error as Error).message}`,
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
        { role: "assistant", content: `取消失败：${result.error ?? "Unknown error"}` },
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
  }

  return (
    <main>
      <nav className="nav">
        <Link className="brand" href="/">
          <span className="brand-mark">A</span>
          <span>AaaS</span>
        </Link>
        <div className="nav-status">
          <span className="pulse" />
          Control plane online
        </div>
      </nav>

      <section className="hero">
        <div className="eyebrow">AGENT AS A SERVICE</div>
        <h1>
          一个 ID，继续使用
          <br />
          <span>另一个人的 Agent。</span>
        </h1>
        <p>
          发布者的原始 Session 保持冻结、私有、不被写入。每位调用者都从同一能力快照
          Fork 出自己的连续对话。
        </p>
        <div className="lookup">
          <label htmlFor="agent-id">Agent ID</label>
          <div className="lookup-row">
            <input
              id="agent-id"
              value={agentId}
              onChange={(event) => setAgentId(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") void findAgent(agentId);
              }}
              placeholder="agt_7f2c9a3e..."
              spellCheck={false}
            />
            <button onClick={() => void findAgent(agentId)} disabled={busy}>
              查找 Agent
              <span>→</span>
            </button>
          </div>
          {lookupError ? <div className="lookup-error">{lookupError}</div> : null}
        </div>
      </section>

      <section className="workspace">
        <aside className="explain">
          <div className="step">
            <span>01</span>
            <div>
              <strong>冻结发布</strong>
              <p>发布时生成不可变 AgentVersion，不暴露本地路径。</p>
            </div>
          </div>
          <div className="line" />
          <div className="step">
            <span>02</span>
            <div>
              <strong>独立 Fork</strong>
              <p>每次 New conversation 都创建新的 Conversation。</p>
            </div>
          </div>
          <div className="line" />
          <div className="step">
            <span>03</span>
            <div>
              <strong>云端中转</strong>
              <p>Job/Lease 发往本地 Runner 或服务器 Runner。</p>
            </div>
          </div>
        </aside>

        <div className={`console ${agent ? "console-active" : ""}`}>
          {agent ? (
            <>
              <header className="agent-header">
                <div className="avatar">{agent.name.slice(0, 1).toUpperCase()}</div>
                <div>
                  <h2>{agent.name}</h2>
                  <div className="agent-meta">
                    <span>{agent.provider}</span>
                    <span>·</span>
                    <span>{agent.executionMode} runner</span>
                    <span className={agent.availability}>{agent.availability}</span>
                  </div>
                </div>
                <button className="new-chat" onClick={() => void newConversation()}>
                  + New conversation
                </button>
              </header>
              <div className="agent-description">{agent.description}</div>
              <div className="messages">
                {messages.length === 0 ? (
                  <div className="empty-chat">
                    <div className="empty-orbit">✦</div>
                    <strong>这个分支还没有消息</strong>
                    <p>发送第一条消息后，Runner 会从冻结快照创建全新的运行时 Session。</p>
                  </div>
                ) : (
                  messages.map((message, index) => (
                    <div className={`message ${message.role}`} key={`${index}-${message.role}`}>
                      <span>{message.role === "user" ? "You" : "A"}</span>
                      <p>{message.content}</p>
                    </div>
                  ))
                )}
                {busy && messages.length > 0 ? (
                  <div className="message assistant">
                    <span>A</span>
                    <div className="job-progress">
                      <div>
                        <i className={`job-dot ${currentJob?.status ?? "queued"}`} />
                        <strong>{describeJob(currentJob)}</strong>
                      </div>
                      <small>
                        {currentJob?.stage ?? "queued"} ·{" "}
                        {currentJob?.runnerAvailability ?? agent.availability}
                      </small>
                      <button type="button" onClick={() => void cancelCurrentJob()}>
                        取消调用
                      </button>
                    </div>
                  </div>
                ) : null}
                <div ref={chatEnd} />
              </div>
              <form className="composer" onSubmit={submit}>
                <textarea
                  value={input}
                  disabled={busy}
                  onChange={(event) => setInput(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && !event.shiftKey) {
                      event.preventDefault();
                      event.currentTarget.form?.requestSubmit();
                    }
                  }}
                  placeholder="给这个 Agent 发消息…"
                  rows={2}
                />
                <button disabled={busy || !input.trim()} aria-label="发送">
                  ↑
                </button>
              </form>
              <footer>
                Conversation {conversationId || "not started"} ·{" "}
                {currentJob ? describeJob(currentJob) : "Source session stays immutable"}
              </footer>
            </>
          ) : (
            <div className="console-placeholder">
              <div className="grid-icon">
                <span />
                <span />
                <span />
                <span />
              </div>
              <h2>输入 Agent ID 开始</h2>
              <p>你会得到一条新的、持续的分支，不会进入发布者的原对话。</p>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
