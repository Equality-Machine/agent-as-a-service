import type { Metadata } from "next";

import { AgentConsole } from "../../AgentConsole";

type AgentPageProps = {
  params: Promise<{ agentId: string }>;
};

export async function generateMetadata({
  params,
}: AgentPageProps): Promise<Metadata> {
  const { agentId } = await params;
  const encodedAgentId = encodeURIComponent(agentId);
  return {
    title: `${agentId} — AaaS Agent`,
    description:
      "Open this Agent in the web, or paste the link into Codex or Claude Code.",
    alternates: {
      canonical: `/a/${encodedAgentId}`,
      types: {
        "application/aaas+json": `/api/v1/agents/${encodedAgentId}/manifest`,
      },
    },
    other: {
      "aaas:agent-id": agentId,
      "aaas:manifest": `/api/v1/agents/${encodedAgentId}/manifest`,
      "aaas:install": "npx -y Equality-Machine/agent-as-a-service",
    },
  };
}

export default async function AgentPage({ params }: AgentPageProps) {
  const { agentId } = await params;
  return <AgentConsole initialAgentId={agentId} />;
}
