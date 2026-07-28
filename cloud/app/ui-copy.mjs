export const PUBLIC_UI_COPY = {
  zh: {
    nav: {
      product: "Codex Sharing",
      useAgent: "打开 Agent",
      githubStar: "GitHub Star",
      switchLanguage: "Switch to English",
      skipToContent: "跳到主要内容",
    },
    home: {
      eyebrow: "CODEX SHARING",
      title: "不用重新交代。直接推进工作。",
      description:
        "粘贴别人分享的 Agent ID，直接说要完成什么。背景、关键判断和做事方式，它都已经了解。",
      agentIdLabel: "输入 Agent ID",
      agentIdHelper: "以 agt_ 开头",
      agentIdPlaceholder: "agt_...",
      openAgent: "开始使用",
      openingAgent: "正在打开…",
      missingId: "收到的是分享链接？直接打开，不用输入 ID。",
      storyEyebrow: "WHY IT MATTERS",
      storyTitle: "好的协作，不该换个人就从头开始。",
      closingTitle: "贴上 Agent ID，继续把事情做完。",
      closingBody: "它带着已有背景开始。你只需要说清楚下一步要什么。",
      publisherCta: "已经有一段成熟对话？把它发布成 Agent",
    },
    story: [
      {
        number: "01",
        title: "从已经完成的工作开始。",
        body:
          "它带着原会话里积累的背景、判断标准和做事方式。你的第一句话，就可以是真正要完成的任务。",
        action: "第一句话，就是真正的任务",
        cards: ["目标和约束", "已有背景", "表达与判断偏好", "验证过的方法"],
      },
      {
        number: "02",
        title: "交给对方一个 Agent，不是另一份说明。",
        body:
          "发出一个链接，对方就能在网页、Codex 或 Claude Code 里继续。少一次背景交接，多一点真正推进。",
        action: "少一次交接，多一点推进",
        destinations: ["网页", "Codex", "Claude Code"],
      },
      {
        number: "03",
        title: "共享同一种能力，保留各自的对话。",
        body:
          "每个人都能独立追问、修改和完成任务。你的内容只属于你，发布者和其他人的对话都保持原样。",
        action: "你的对话，只属于你",
        conversations: ["我的推进", "同事的推进"],
      },
    ],
    guide: {
      eyebrow: "HOW TO START",
      title: "收到就能用。想分享，也只需要一句话。",
      body:
        "网页适合立即开始，Codex 和 Claude Code 适合把 Agent 带进正在做的工作。下面两段话可以直接复制。",
      consumerLabel: "使用别人分享的 Agent",
      consumerTitle: "打开链接，直接说任务。",
      consumerBody:
        "在网页里不需要安装任何东西。想在 Codex 或 Claude Code 里调用，复制下面的说明交给它即可。",
      consumerSteps: [
        "网页：打开分享链接，直接开始对话。",
        "Codex：复制下面的说明，粘贴到当前任务。",
        "继续追问时，它会保持这次对话的上下文。",
      ],
      consumerNote: "只使用别人的 Agent，不需要 Runner。",
      publisherLabel: "发布自己的 Agent",
      publisherTitle: "把已经磨合好的会话分享出去。",
      publisherBody:
        "在你想分享的 Codex 或 Claude Code 会话中，复制下面的说明。它会完成检查、配置和发布。",
      publisherSteps: [
        "回到已经完成工作的那段会话。",
        "复制下面的说明，填入 Agent 名称。",
        "确认后获得 Agent ID 和可分享链接。",
      ],
      publisherNote: "只有发布时才检查 Runner；安装前会先征得你的确认。",
      promptLabel: "复制给 Codex / Claude Code",
      copyForCodex: "复制给 Codex",
      copied: "已复制",
      installCommandLabel: "两种方式使用同一个安装入口；默认只安装 Skill + MCP：",
      agentPlaceholder: "<粘贴 Agent 分享链接或 Agent ID>",
      consumerPrompt:
        "请使用这个 Codex Sharing Agent：\n{agent}\n\n如果当前还没有 Codex Sharing，请先运行：\nnpx -y Equality-Machine/agent-as-a-service\n\n如果安装后需要重启客户端，请明确提醒我；当前任务可优先按分享页里的调用说明继续。\n\n请用这个 Agent 帮我完成：\n<写下你的任务>",
      publisherPrompt:
        "请使用 Codex Sharing 发布当前会话。\n\n如果当前还没有 Codex Sharing，请先运行：\nnpx -y Equality-Machine/agent-as-a-service\n\n发布前检查 Runner。只有确实需要时才安装或配置，并先说明会修改什么、征得我的确认。\n\n把当前会话发布为本地运行的 Agent，名称是：\n<填写 Agent 名称>\n\n完成后返回 Agent ID 和分享链接。",
    },
    share: {
      eyebrow: "这个 Agent 已准备好",
      agentIdLabel: "Agent ID",
      copyAgentId: "复制 Agent ID",
      copied: "已复制",
      online: "在线，可以开始",
      offline: "当前暂不可用",
      descriptionFallback:
        "它已经了解此前的背景和做事方式。直接告诉它这次要完成什么。",
      promptLabel: "这次想让它帮你完成什么？",
      promptHelper: "直接说结果，不必重复背景。",
      promptPlaceholder: "例如：把这个方案收敛成三步，并指出最大风险…",
      send: "发送",
      newConversation: "新建对话",
      emptyTitle: "直接说你要的结果",
      emptyBody: "可以让它做决策、写草稿、分析问题，或给出下一步方案。",
      privateNote: "这段对话只属于你",
      useElsewhere: "也可以在 Codex 或 Claude Code 里继续",
      useElsewhereBody: "复制这个页面链接，粘贴给你的编码 Agent。它会读到安装与调用说明。",
      setupDetails: "查看使用方法",
      switchAgent: "打开另一个 Agent",
      loading: "正在读取 Agent…",
      notStarted: "等待你的第一个任务",
      cancel: "取消",
      cancelled: "本次调用已取消。",
      cancelFailed: "取消失败",
      callFailed: "调用失败",
    },
  },
  en: {
    nav: {
      product: "Codex Sharing",
      useAgent: "Open an Agent",
      githubStar: "Star on GitHub",
      switchLanguage: "切换到中文",
      skipToContent: "Skip to main content",
    },
    home: {
      eyebrow: "CODEX SHARING",
      title: "Skip the briefing. Start the work.",
      description:
        "Paste the Agent ID someone shared with you and go straight to the task. The context, key decisions, and way of working are already there.",
      agentIdLabel: "Enter Agent ID",
      agentIdHelper: "Starts with agt_",
      agentIdPlaceholder: "agt_...",
      openAgent: "Start working",
      openingAgent: "Opening…",
      missingId: "Got a share link? Open it directly—no ID entry needed.",
      storyEyebrow: "WHY IT MATTERS",
      storyTitle: "Great work should not restart with every handoff.",
      closingTitle: "Paste the Agent ID. Keep the work moving.",
      closingBody: "It starts with the background. You start with what needs to happen next.",
      publisherCta: "Already have a great working session? Publish it as an Agent",
    },
    story: [
      {
        number: "01",
        title: "Start from work already done.",
        body:
          "It carries the context, judgment calls, and working style built in the original session. Your first message can be the real task.",
        action: "Begin with the outcome",
        cards: ["Goals and constraints", "Existing context", "How you decide", "Proven methods"],
      },
      {
        number: "02",
        title: "Hand over an Agent, not another brief.",
        body:
          "Send one link and the other person can continue on the web, in Codex, or in Claude Code. Less context transfer. More momentum.",
        action: "Less handoff. More momentum.",
        destinations: ["Web", "Codex", "Claude Code"],
      },
      {
        number: "03",
        title: "Share the capability. Keep every conversation private.",
        body:
          "Everyone can question, revise, and finish the work independently. Your content stays yours; the publisher’s original and everyone else’s conversations remain unchanged.",
        action: "Your conversation stays yours",
        conversations: ["My progress", "Teammate’s progress"],
      },
    ],
    guide: {
      eyebrow: "HOW TO START",
      title: "Use what was shared. Share what already works.",
      body:
        "The web is the fastest way in. Codex and Claude Code bring the Agent into work already in motion. Copy either instruction below.",
      consumerLabel: "Use someone else’s Agent",
      consumerTitle: "Open the link. Start with the task.",
      consumerBody:
        "Nothing to install on the web. To call the Agent from Codex or Claude Code, paste the ready-made instruction below.",
      consumerSteps: [
        "Web: open the share link and start the conversation.",
        "Codex: copy the instruction below into your current task.",
        "Follow up naturally; this conversation keeps its context.",
      ],
      consumerNote: "Using someone else’s Agent never requires a Runner.",
      publisherLabel: "Publish your own Agent",
      publisherTitle: "Share the session that already knows the work.",
      publisherBody:
        "Paste the instruction below into the Codex or Claude Code session you want to share. It handles setup checks and publishing.",
      publisherSteps: [
        "Return to the session where the useful work happened.",
        "Copy the instruction below and add an Agent name.",
        "Confirm, then receive an Agent ID and share link.",
      ],
      publisherNote:
        "A Runner is checked only for publishing, and nothing is installed without your approval.",
      promptLabel: "Paste into Codex / Claude Code",
      copyForCodex: "Copy for Codex",
      copied: "Copied",
      installCommandLabel:
        "Both paths share one installer; by default it adds only the Skill + MCP:",
      agentPlaceholder: "<paste an Agent share link or Agent ID>",
      consumerPrompt:
        "Please use this Codex Sharing Agent:\n{agent}\n\nIf Codex Sharing is not installed yet, first run:\nnpx -y Equality-Machine/agent-as-a-service\n\nIf the client must restart after installation, tell me clearly. For this task, use the call instructions embedded in the share page when possible.\n\nUse this Agent to help me:\n<describe your task>",
      publisherPrompt:
        "Please publish the current session with Codex Sharing.\n\nIf Codex Sharing is not installed yet, first run:\nnpx -y Equality-Machine/agent-as-a-service\n\nCheck for a Runner before publishing. Install or configure one only when required, explain what will change, and ask for my approval first.\n\nPublish the current session as a locally run Agent named:\n<enter Agent name>\n\nReturn the Agent ID and share link when finished.",
    },
    share: {
      eyebrow: "THIS AGENT IS READY",
      agentIdLabel: "Agent ID",
      copyAgentId: "Copy Agent ID",
      copied: "Copied",
      online: "Online — ready to start",
      offline: "Unavailable right now",
      descriptionFallback:
        "It already knows the background and way of working. Tell it what needs to be finished.",
      promptLabel: "What should this Agent help you finish?",
      promptHelper: "Start with the outcome. No need to repeat the backstory.",
      promptPlaceholder: "For example: turn this plan into three steps and flag the biggest risk…",
      send: "Send",
      newConversation: "New conversation",
      emptyTitle: "Start with the result you need",
      emptyBody:
        "Ask for a decision, a draft, an analysis, or a concrete next-step plan.",
      privateNote: "Private to this conversation",
      useElsewhere: "Continue in Codex or Claude Code",
      useElsewhereBody:
        "Copy this page link and paste it into your coding Agent. It can read the setup and usage instructions.",
      setupDetails: "See how to use it",
      switchAgent: "Open another Agent",
      loading: "Loading Agent…",
      notStarted: "Waiting for your first task",
      cancel: "Cancel",
      cancelled: "This run was cancelled.",
      cancelFailed: "Cancellation failed",
      callFailed: "Call failed",
    },
  },
};
