import { createElement } from "react";

export const AAAS_INSTALL_COMMAND =
  "npx -y Equality-Machine/agent-as-a-service";

function joinUrl(origin, pathname) {
  return `${origin.replace(/\/+$/, "")}${pathname}`;
}

export function buildAgentManifest({ agentId, origin = "" }) {
  const encodedAgentId = encodeURIComponent(agentId);
  const sharePath = `/a/${encodedAgentId}`;
  const manifestPath = `/api/v1/agents/${encodedAgentId}/manifest`;
  const invokeUrl = joinUrl(origin, "/api/v1/invoke");

  return {
    schemaVersion: "2026-07-27",
    kind: "aaas-agent-link",
    agentId,
    shareUrl: joinUrl(origin, sharePath),
    manifestUrl: joinUrl(origin, manifestPath),
    consumer: {
      runnerRequired: false,
      install: {
        when: "AaaS MCP tools are unavailable",
        approvalRequired: true,
        command: AAAS_INSTALL_COMMAND,
        restartClientAfterInstall: true,
        note: "Install Skill + MCP only. Never install a Runner merely to use this Agent.",
      },
      mcp: {
        tools: ["find_agent", "agent_start", "agent_continue", "agent_end"],
        flow: [
          `Call find_agent with ${agentId}.`,
          "Call agent_start for the first message and preserve conversationId.",
          "Call agent_continue with the same conversationId for follow-up messages.",
          "Call agent_end when the interaction is complete.",
        ],
      },
      http: {
        purpose:
          "Immediate fallback when the newly installed MCP is not visible until the client restarts.",
        start: {
          method: "POST",
          url: invokeUrl,
          body: { agentId, input: "<user message>" },
          returns: ["conversationId", "jobId"],
        },
        poll: {
          method: "GET",
          url: joinUrl(origin, "/api/v1/jobs/{jobId}"),
          until: ["completed", "failed", "cancelled"],
        },
        continue: {
          method: "POST",
          url: invokeUrl,
          body: {
            conversationId: "<conversationId from start>",
            input: "<follow-up message>",
          },
        },
        end: {
          method: "POST",
          url: joinUrl(origin, "/api/v1/conversations/{conversationId}/end"),
        },
      },
    },
  };
}

const LINK_COPY = {
  zh: {
    kicker: "在你的工具里继续",
    title: "把这个页面链接交给 Codex 或 Claude Code",
    body:
      "如果尚未安装 AaaS，它会从页面里的说明完成消费者配置。使用别人分享的 Agent 不需要 Runner。",
    summary: "如何安装和使用",
    steps: [
      "先检查 AaaS MCP 工具：find_agent、agent_start、agent_continue、agent_end。",
      "如果工具不存在，先征得你的同意，再安装消费者 Skill + MCP：",
      "安装后重启客户端即可使用 MCP；当前任务也可以按照机器清单中的 HTTP 流程立即调用。",
    ],
    manifest: "打开机器可读 Agent 清单",
  },
  en: {
    kicker: "CONTINUE IN YOUR TOOLS",
    title: "Give this page link to Codex or Claude Code",
    body:
      "If AaaS is not installed yet, the instructions on this page guide the consumer setup. You never need a Runner just to use someone else’s Agent.",
    summary: "How to install and use it",
    steps: [
      "First, check for the AaaS MCP tools: find_agent, agent_start, agent_continue, and agent_end.",
      "If those tools are missing, ask for your approval before installing the consumer Skill + MCP:",
      "Restart the client to expose the MCP tools. The current task can also use the HTTP flow in the machine-readable manifest immediately.",
    ],
    manifest: "Open the machine-readable Agent manifest",
  },
};

export function AgentLinkInstructions({ agentId, language = "zh" }) {
  const manifest = buildAgentManifest({ agentId });
  const protocolJson = JSON.stringify(manifest).replaceAll("<", "\\u003c");
  const copy = LINK_COPY[language] ?? LINK_COPY.zh;

  return createElement(
    "section",
    {
      className: "agent-link-instructions",
      "data-aaas-agent-id": agentId,
      "aria-labelledby": "agent-link-title",
    },
    createElement(
      "div",
      { className: "agent-link-copy" },
      createElement("span", { className: "agent-link-kicker" }, copy.kicker),
      createElement(
        "h2",
        { id: "agent-link-title" },
        copy.title,
      ),
      createElement("p", null, copy.body),
    ),
    createElement(
      "details",
      null,
      createElement("summary", null, copy.summary),
      createElement(
        "ol",
        null,
        createElement(
          "li",
          null,
          copy.steps[0],
        ),
        createElement(
          "li",
          null,
          copy.steps[1],
          createElement("code", null, AAAS_INSTALL_COMMAND),
        ),
        createElement(
          "li",
          null,
          copy.steps[2],
        ),
      ),
      createElement(
        "a",
        {
          href: manifest.manifestUrl,
          className: "manifest-link",
          type: "application/aaas+json",
        },
        copy.manifest,
      ),
    ),
    createElement("script", {
      type: "application/aaas+json",
      dangerouslySetInnerHTML: { __html: protocolJson },
    }),
  );
}
