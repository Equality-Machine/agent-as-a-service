export type PublicLanguage = "zh" | "en";

export declare const PUBLIC_UI_COPY: Record<PublicLanguage, {
  nav: {
    product: string;
    useAgent: string;
    githubStar: string;
    switchLanguage: string;
    skipToContent: string;
  };
  home: Record<string, string>;
  story: Array<{
    number: string;
    title: string;
    body: string;
    action: string;
    cards?: string[];
    destinations?: string[];
    conversations?: string[];
  }>;
  guide: {
    eyebrow: string;
    title: string;
    body: string;
    consumerLabel: string;
    consumerTitle: string;
    consumerBody: string;
    consumerSteps: string[];
    consumerNote: string;
    publisherLabel: string;
    publisherTitle: string;
    publisherBody: string;
    publisherSteps: string[];
    publisherNote: string;
    promptLabel: string;
    copyForCodex: string;
    copied: string;
    installCommandLabel: string;
    agentPlaceholder: string;
    consumerPrompt: string;
    publisherPrompt: string;
  };
  share: Record<string, string>;
}>;
