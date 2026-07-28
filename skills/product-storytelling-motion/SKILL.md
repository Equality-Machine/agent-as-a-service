---
name: product-storytelling-motion
description: Designs product pages as scroll-led stories where real interface states and causal motion demonstrate user value. Use when redesigning landing pages, product narratives, scrollytelling, or when motion feels decorative, card-like, overly technical, or hard to follow.
---

# Product Storytelling Motion

## Quick start

Write the transformation before touching layout:

`[person in a concrete situation] goes from [costly old state] to [valuable new state] without [main friction].`

Then build a filmstrip of 5–7 still frames. If a frame cannot explain itself without animation, simplify it.

## Workflow

1. Read the real product, current page, and primary action.
2. Define one audience, one moment of need, and one promised change.
3. Map the story spine: Hook → Demonstration → Demonstration → Payoff → Trust → Action.
4. For each scene, specify:
   - one value claim;
   - one real product object;
   - one causal state change;
   - one sentence of outcome-first copy;
   - the next action.
5. Make a static filmstrip before implementing motion.
6. Build motion as `enter → act → hold → exit`; keep the hold long enough to read.
7. Test the complete journey with real scrolling, reduced motion, and mobile layout.

## Scene rules

- Keep one visual protagonist through adjacent scenes.
- Demonstrate with recognizable product UI, data, messages, or outputs.
- Move only what changes in the user's experience.
- Use one sticky stage for one coherent sequence; return to normal flow afterward.
- Change copy only after the previous copy is gone. Never overlap large headlines.
- Keep persistent navigation and the primary CTA easy to find.
- Repeat the CTA after a demonstrated payoff, not after every paragraph.

## Motion rules

- Scroll controls progress; it must not hijack scrolling.
- Prefer transform and opacity. Use clips only when they reveal a meaningful result.
- Use eased transitions around state boundaries and long readable plateaus.
- Decorative loops are limited to subtle ambience and stop off-screen.
- Provide a complete static state for `prefers-reduced-motion`.
- On mobile, shorten the sequence and preserve the same causal story.

## Copy rules

- Name the situation and outcome before the mechanism.
- Use the user's language, not architecture terms or implementation labels.
- Headlines make one claim. Body copy explains one consequence.
- Show specific examples inside the product demonstration.
- Trust copy answers the fear created by the promise.

## Rejection tests

Reject a concept if it depends on:

- abstract orbs, particles, tunnels, or 3D objects with no product meaning;
- a carousel of feature cards;
- motion that would still happen if the product changed;
- screenshots floating without demonstrating a state change;
- three claims competing in one viewport;
- cinematic atmosphere that obscures the primary action.

## Validation

- Capture frames at the beginning, action, hold, and exit of every scene.
- Each captured frame must have one obvious focal point and one readable claim.
- Verify the real primary action before and after the story.
- Check keyboard access, contrast, mobile overflow, and reduced motion.
- Measure initial bundle impact; do not add a motion library without a clear need.

See [REFERENCE.md](REFERENCE.md) for the observed storytelling grammar and
[EXAMPLES.md](EXAMPLES.md) for a worked Agent-service adaptation.
