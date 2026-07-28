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
    kicker: "带到你的工作流里",
    title: "把这个链接粘贴给 Codex 或 Claude Code，就能使用",
    body:
      "它们会读到页面里的使用说明，并连接这个 Agent。如果缺少 AaaS 工具，会先征得你的同意再安装。只使用别人分享的 Agent，永远不需要 Runner。",
    summary: "在编码 Agent 里使用",
    steps: [
      "把当前页面链接粘贴给 Codex 或 Claude Code。",
      "如果它找不到 AaaS 工具，会先向你确认，再安装消费者 Skill + MCP：",
      "安装后重启客户端，即可在后续对话中继续使用；当前任务也可以按页面内的清单直接调用。",
    ],
    manifest: "查看机器可读使用清单",
  },
  en: {
    kicker: "TAKE IT INTO YOUR WORKFLOW",
    title: "Paste this link into Codex or Claude Code to use the Agent",
    body:
      "They can read the instructions on this page and connect to the Agent. If the AaaS tools are missing, they ask before installing anything. Using someone else’s Agent never requires a Runner.",
    summary: "Use it in your coding agent",
    steps: [
      "Paste this page link into Codex or Claude Code.",
      "If the AaaS tools are missing, it asks before installing the consumer Skill + MCP:",
      "Restart the client to use it in future conversations. The current task can also call the Agent immediately through the manifest on this page.",
    ],
    manifest: "View the machine-readable usage manifest",
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
