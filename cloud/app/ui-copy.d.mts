export type PublicLanguage = "zh" | "en";

export declare const PUBLIC_UI_COPY: Record<PublicLanguage, {
  nav: {
    product: string;
    useAgent: string;
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
  share: Record<string, string>;
}>;
