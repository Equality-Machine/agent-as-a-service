import { AgentConsole } from "./AgentConsole";

type HomeProps = {
  searchParams: Promise<{ agent?: string | string[] }>;
};

export default async function Home({ searchParams }: HomeProps) {
  const query = await searchParams;
  const rawAgentId = Array.isArray(query.agent) ? query.agent[0] : query.agent;
  return <AgentConsole initialAgentId={rawAgentId?.trim() ?? ""} />;
}
