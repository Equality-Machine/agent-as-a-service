export const PUBLIC_UI_COPY = {
  zh: {
    nav: {
      product: "AaaS",
      useAgent: "使用 Agent",
      switchLanguage: "Switch to English",
      skipToContent: "跳到主要内容",
    },
    home: {
      eyebrow: "AGENT AS A SERVICE",
      title: "找到 Agent，直接开始。",
      description:
        "输入发布者给你的 Agent ID。它已经带着此前积累的背景和能力，你不用从头讲起。",
      agentIdLabel: "输入 Agent ID",
      agentIdHelper: "通常以 agt_ 开头",
      agentIdPlaceholder: "agt_...",
      openAgent: "打开 Agent",
      openingAgent: "正在查找…",
      missingId: "没有 ID？请让发布者把 Agent 分享链接发给你。",
      storyEyebrow: "WHY IT WORKS",
      storyTitle: "不是空白对话。是已经形成的方法，继续往前。",
      closingTitle: "从一个 Agent ID 开始。",
      closingBody: "输入发布者给你的 ID，打开 Agent，然后直接说出你想完成的事情。",
    },
    story: [
      {
        number: "01",
        title: "从已经知道的地方开始。",
        body:
          "这个 Agent 带着此前积累的背景、偏好和工作方法。你可以直接说任务，不必再做一遍自我介绍。",
        action: "带着已有理解",
        cards: ["你的目标", "工作背景", "表达偏好", "已经验证的方法"],
      },
      {
        number: "02",
        title: "一个链接，交给任何正在工作的人。",
        body:
          "同事可以在网页打开，也可以把链接直接交给 Codex 或 Claude Code。拿到链接，就能开始使用。",
        action: "网页、Codex、Claude Code",
        destinations: ["网页", "Codex", "Claude Code"],
      },
      {
        number: "03",
        title: "每个人，都有自己的对话。",
        body:
          "你们可以各自继续追问、修改和完成任务。发布者原来的内容保持原样，彼此也不会混在一起。",
        action: "各自继续，各自完成",
        conversations: ["我的方案", "同事的方案"],
      },
    ],
    share: {
      eyebrow: "分享给你的 Agent",
      agentIdLabel: "Agent ID",
      copyAgentId: "复制 Agent ID",
      copied: "已复制",
      online: "可以开始",
      offline: "暂时不可用",
      descriptionFallback:
        "这个 Agent 已经准备好继续工作。直接告诉它你想完成什么。",
      promptLabel: "你想让它做什么？",
      promptHelper: "发送第一条消息，开始一段只属于你的对话。",
      promptPlaceholder: "描述你想完成的事情…",
      send: "发送",
      newConversation: "新建对话",
      emptyTitle: "从一个具体任务开始",
      emptyBody: "它已经准备好接着工作，你不必从头交代背景。",
      privateNote: "这段对话只属于你",
      useElsewhere: "也可以在 Codex / Claude Code 中使用",
      useElsewhereBody: "复制此页面链接，直接粘贴给你的编码 Agent。",
      setupDetails: "查看安装与配置说明",
      switchAgent: "换一个 Agent",
      loading: "正在打开 Agent…",
      notStarted: "还没有开始",
      cancel: "取消",
      cancelled: "本次调用已取消。",
      cancelFailed: "取消失败",
      callFailed: "调用失败",
    },
  },
  en: {
    nav: {
      product: "AaaS",
      useAgent: "Use an Agent",
      switchLanguage: "切换到中文",
      skipToContent: "Skip to main content",
    },
    home: {
      eyebrow: "AGENT AS A SERVICE",
      title: "Find the Agent. Start from there.",
      description:
        "Enter the Agent ID shared with you. It brings the context and capabilities already built up, so you do not have to start from scratch.",
      agentIdLabel: "Enter Agent ID",
      agentIdHelper: "It usually starts with agt_",
      agentIdPlaceholder: "agt_...",
      openAgent: "Open Agent",
      openingAgent: "Finding Agent…",
      missingId: "No ID? Ask the publisher to send you the Agent link.",
      storyEyebrow: "WHY IT WORKS",
      storyTitle:
        "Not a blank chat. A working way of thinking, ready to continue.",
      closingTitle: "Start with an Agent ID.",
      closingBody:
        "Enter the ID you received, open the Agent, and tell it what you want to get done.",
    },
    story: [
      {
        number: "01",
        title: "Start from what is already understood.",
        body:
          "The Agent carries the context, preferences, and working methods built up before. Go straight to the task—no need to introduce everything again.",
        action: "Already understands the work",
        cards: ["Your goal", "Work context", "Your preferences", "Proven methods"],
      },
      {
        number: "02",
        title: "One link, ready wherever the work happens.",
        body:
          "A teammate can open it on the web, or hand the link directly to Codex or Claude Code. Once they have the link, they can begin.",
        action: "Web, Codex, Claude Code",
        destinations: ["Web", "Codex", "Claude Code"],
      },
      {
        number: "03",
        title: "A conversation for every person.",
        body:
          "Each person can keep asking, editing, and completing the work in their own conversation. The publisher’s original stays as it was, and nobody’s work gets mixed together.",
        action: "Continue independently",
        conversations: ["My direction", "Teammate’s direction"],
      },
    ],
    share: {
      eyebrow: "AN AGENT SHARED WITH YOU",
      agentIdLabel: "Agent ID",
      copyAgentId: "Copy Agent ID",
      copied: "Copied",
      online: "Ready to start",
      offline: "Temporarily unavailable",
      descriptionFallback:
        "This Agent is ready to continue the work. Tell it what you want to accomplish.",
      promptLabel: "What would you like it to do?",
      promptHelper: "Send the first message to begin a conversation of your own.",
      promptPlaceholder: "Describe what you want to accomplish…",
      send: "Send",
      newConversation: "New conversation",
      emptyTitle: "Start with a concrete task",
      emptyBody:
        "It is ready to pick up the work, so you do not need to explain the background again.",
      privateNote: "This conversation belongs to you",
      useElsewhere: "Use it in Codex or Claude Code",
      useElsewhereBody:
        "Copy this page link and paste it directly into your coding Agent.",
      setupDetails: "View install and setup instructions",
      switchAgent: "Use another Agent",
      loading: "Opening Agent…",
      notStarted: "Not started",
      cancel: "Cancel",
      cancelled: "This run was cancelled.",
      cancelFailed: "Cancellation failed",
      callFailed: "Call failed",
    },
  },
};
