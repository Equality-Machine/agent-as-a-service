# Storytelling grammar

This reference distills transferable patterns observed from
[Cora](https://cora.computer/). It is a method reference, not a visual-style
template.

## The central idea

The page behaves like a product demonstration inside a continuous editorial
world. The user is never asked to infer value from decoration. A recognizable
product object changes state and the surrounding copy names the benefit.

## Observed story spine

1. **Life change first.** The hero promises time and control before describing
   the feature set.
2. **Social proof as a bridge.** Testimonials lower skepticism before the long
   demonstration.
3. **One action per scene.** Inbox rows separate, unimportant rows disappear,
   one message expands, and a draft completes.
4. **A memorable payoff.** Messages enter an envelope; the envelope closes and
   opens into a compact brief. This makes summarization tangible.
5. **Trust after desire.** Learning behavior and privacy answer the concerns
   created by a product that reads personal data.
6. **Conversion in normal flow.** Pricing, proof, FAQ, and the final CTA stop
   the cinematic sequence and make the decision practical.

## Static and moving layers

| Layer | Usually still | Moves only when |
| --- | --- | --- |
| Navigation and CTA | Yes | state or theme requires contrast |
| Scene headline and body | Yes | entering or leaving a scene |
| Environmental backdrop | Mostly | the story changes location or mood |
| Product frame | Yes | the demonstrated workflow advances |
| Product content | No | a specific user-visible action occurs |

The restraint matters. Stable copy gives the eye a home while the product
object performs the proof.

## Interaction grammar

- A tall scroll container supplies time.
- A viewport-height sticky stage supplies continuity.
- Scene copy uses long plateaus instead of constant crossfades.
- Product elements use discrete, causal transformations.
- The next scene inherits an object or result from the previous scene.
- The sequence ends before trust and pricing information.

## What not to copy

- Do not reuse Cora's sky, landscape, cloud, stamp, or envelope identity.
- Do not copy its exact composition, typography, wording, or product examples.
- Do not treat a scenic backdrop as a substitute for a clear demonstration.
- Do not assume every product needs a multi-thousand-pixel pinned sequence.

## Technical pattern

Start without a motion framework:

1. measure normalized progress from a tall section;
2. convert progress into scene-local ranges;
3. ease the first and last 10–15% of each range;
4. reserve the middle as a readable hold;
5. update CSS variables in one animation frame;
6. pause work when the section is off-screen.

Add a timeline library only when many dependent state changes become difficult
to test. WebGL is unsuitable unless spatial depth is part of the product truth.

## Review questions

- What does the user understand after this scene that they did not before?
- Which real product object proves it?
- What changed, and why did it change?
- Can the frame be understood while paused?
- Does the next scene inherit something meaningful?
- What concern should the page answer after the payoff?
