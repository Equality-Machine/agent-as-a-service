import type { ReactElement } from "react";

export const AAAS_INSTALL_COMMAND: string;

export function buildAgentManifest(input: {
  agentId: string;
  origin?: string;
}): Record<string, unknown>;

export function AgentLinkInstructions(props: {
  agentId: string;
}): ReactElement;
