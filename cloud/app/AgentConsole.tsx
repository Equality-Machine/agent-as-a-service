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

const wait = (milliseconds: number) =>
  new Promise((resolve) => setTimeout(resolve, milliseconds));

export function AgentConsole() {
  const [agentId, setAgentId] = useState("");
  const [agent, setAgent] = useState<Agent | null>(null);
  const [lookupError, setLookupError] = useState("");
  const [conversationId, setConversationId] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const chatEnd = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEnd.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, busy]);

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

      for (let attempt = 0; attempt < 150; attempt += 1) {
        await wait(800);
        const jobResponse = await fetch(`/api/v1/jobs/${queued.jobId}`);
        const jobData = await jobResponse.json();
        if (jobData.job?.status === "completed") {
          setMessages((current) => [
            ...current,
            { role: "assistant", content: jobData.job.output },
          ]);
          return;
        }
        if (jobData.job?.status === "failed") {
          throw new Error(jobData.job.error ?? "Agent execution failed");
        }
      }
      throw new Error("Agent is offline or took too long to respond");
    } catch (error) {
      setMessages((current) => [
        ...current,
        { role: "assistant", content: `调用失败：${(error as Error).message}` },
      ]);
    } finally {
      setBusy(false);
    }
  }

  async function newConversation() {
    if (conversationId) {
      await fetch(`/api/v1/conversations/${conversationId}/end`, {
        method: "POST",
      });
    }
    setConversationId("");
    setMessages([]);
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
                if (event.key === "Enter") void findAgent();
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
                    <span className={agent.availability}>
                      {agent.availability}
                    </span>
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
                    <p className="thinking">Runner 正在执行<span>...</span></p>
                  </div>
                ) : null}
                <div ref={chatEnd} />
              </div>
              <form className="composer" onSubmit={submit}>
                <textarea
                  value={input}
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
                Conversation {conversationId || "not started"} · Source session stays immutable
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
