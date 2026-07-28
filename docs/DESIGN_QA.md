# AaaS Web Redesign — Design QA

## Scope

- Build source:
  - `cloud/app/AgentConsole.tsx`
  - `cloud/app/NarrativeStory.tsx`
  - `cloud/app/globals.css`
  - `cloud/app/ui-copy.mjs`
- Production: `https://aaas-agent-service.b4yesc4t.chatgpt.site`
- Shared Agent route: `https://aaas-agent-service.b4yesc4t.chatgpt.site/a/agt_14b2806758a042db`
- Saved Sites version: `7`

## Visual grounding

- Interaction narrative reference: `https://cora.computer`
- The reference was used for scroll-based storytelling and transition rhythm,
  not as a visual style to copy.
- Implemented image asset: `../cloud/public/aaas-cinematic-light.jpg`
- The selected visual target, reference captures, and same-canvas comparisons
  were inspected during implementation but are not committed as build inputs.

## Implementation screenshots

- Home, desktop, English, 1440 × 900:
  [aaas-home-en.png](assets/screenshots/aaas-home-en.png)
- Home, desktop, Chinese, 1440 × 900:
  [aaas-home-zh.png](assets/screenshots/aaas-home-zh.png)
- Historical desktop, mobile, and live-Agent captures are archived under
  [`assets/screenshots/legacy/`](assets/screenshots/legacy/).
- Story, shared-Agent, mobile, landscape, and reduced-motion states were
  visually inspected in the in-app browser during acceptance.

## Viewports and layout

- 1440 × 900 desktop: passed; hero hierarchy, Agent ID entry, preview card, story sections, and shared-Agent task panel are legible and balanced.
- 375 × 812 mobile: passed; no horizontal overflow, 48 px form controls, readable typography, visible language and Agent-switch controls.
- 812 × 375 landscape: passed; no horizontal overflow and no clipped primary action.
- Reduced-motion emulation: passed; all story states resolve without depending on animation.

## Core interactions

- Home Agent ID entry → canonical `/a/{agentId}` route: passed.
- Chinese/English toggle, persisted language, and document language update: passed.
- Shared-Agent status and copy-ID affordance: passed.
- Start conversation, friendly queued/running/finalizing states, and cancellation affordance: passed.
- Continue the same conversation: passed using conversation `cnv_d7bbc63b404244fd`.
- Start a new independent conversation: passed; prior transcript clears before the next message.
- Markdown heading and table rendering: passed on production.
- Remote Markdown image rendering: passed on production.
- Consumer guidance for Codex and Claude Code without requiring a Runner: present and readable.
- Keyboard focus, labels, skip link, minimum touch targets, and reduced-motion behavior: passed.

## Runtime and console

- Production Agent `agt_14b2806758a042db`: online and completed two sequential messages.
- First response rendered an H1, a two-column Markdown table, and an image.
- Second response continued in the same conversation and returned `同一段对话继续成功。`
- Browser runtime exceptions: none observed.
- Browser console warnings/errors: none observed.

## Automated verification

- Root test suite: 43 tests; 38 passed, 5 gated skips, 0 failed.
- Cloud test/build suite: 10 passed, 0 failed.
- Cloud lint: passed.
- `git diff --check`: passed.

## Findings and fix history

1. The first desktop pass left the product action weaker than the story. The hero was revised so the labeled Agent ID field and primary action are the immediate focus.
2. Mobile navigation originally hid the main Agent-switch action. The compact switch control now remains visible while the duplicate text link is removed.
3. Motion was initially visual-only. Story phases now encode clear start, middle, and complete states and resolve immediately when reduced motion is requested.
4. The shared page initially exposed setup detail too early. Consumer setup is now collapsed beneath the direct web conversation, while the page keeps machine-readable installation guidance for Codex and Claude Code.
5. Final production validation confirmed the deployed source matches the locally verified design and that the real Runner path completes within normal response time.

final result: passed
