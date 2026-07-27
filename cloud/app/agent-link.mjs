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

export function AgentLinkInstructions({ agentId }) {
  const manifest = buildAgentManifest({ agentId });
  const protocolJson = JSON.stringify(manifest).replaceAll("<", "\\u003c");

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
      createElement("span", { className: "agent-link-kicker" }, "USE IN YOUR AGENT"),
      createElement(
        "h2",
        { id: "agent-link-title" },
        "把这个链接直接粘贴给 Codex 或 Claude Code",
      ),
      createElement(
        "p",
        null,
        "页面同时提供人类可读说明和机器清单。只调用这个 Agent 不需要 Runner。",
      ),
    ),
    createElement(
      "details",
      { open: true },
      createElement("summary", null, "Codex / Claude Code 自动配置说明"),
      createElement(
        "ol",
        null,
        createElement(
          "li",
          null,
          "先检查 AaaS MCP 工具：find_agent、agent_start、agent_continue、agent_end。",
        ),
        createElement(
          "li",
          null,
          "如果工具不存在，先征得用户同意，再安装消费者 Skill + MCP：",
          createElement("code", null, AAAS_INSTALL_COMMAND),
        ),
        createElement(
          "li",
          null,
          "安装后重启客户端即可使用 MCP；当前任务也可以按照机器清单中的 HTTP 流程立即调用。",
        ),
      ),
      createElement(
        "a",
        {
          href: manifest.manifestUrl,
          className: "manifest-link",
          type: "application/aaas+json",
        },
        "打开机器可读 Agent 清单 →",
      ),
    ),
    createElement("script", {
      type: "application/aaas+json",
      dangerouslySetInnerHTML: { __html: protocolJson },
    }),
  );
}
