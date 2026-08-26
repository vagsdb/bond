# Bond Matching Engine v0.1

The first matching engine is intentionally **deterministic, inspectable, and conservative**.

It is not intended to be the final intelligence layer. Its purpose is to make the product's matching assumptions explicit before a language model or learned recommender can make those assumptions harder to inspect.

## Public product vs internal lab

The public Bond experience does **not** show people to browse and does **not** show compatibility percentages.

The internal Matching Lab may show numerical components because it is a diagnostic instrument. Those numbers are for developers and experiments, not for users.

The lab currently runs against a small set of synthetic Athens candidate profiles. No real users are exposed.

## Candidate evaluation

Each pair is evaluated across five dimensions:

1. **Shared core** — meaningful overlap in curiosity, conversational orientation, culture, place, making, learning, depth, or other latent themes.
2. **Interesting divergence** — difference that appears capable of adding a new world rather than merely creating incompatibility.
3. **Reciprocity** — whether each person appears to offer something the other has asked for. A one-sided useful introduction is penalized.
4. **Current intention fit** — whether the introduction is relevant to what both people say they want now.
5. **Boundary penalty** — conflicts with `Not this` preferences or reciprocal exclusions.

The current diagnostic total is:

```text
0.28 × shared core
+ 0.22 × interesting divergence
+ 0.27 × reciprocity
+ 0.23 × current intention fit
− 0.38 × boundary penalty
```

This formula is not a product truth. It is a testable v0.1 hypothesis.

## Decision states

The engine returns one of three states:

- `introduce` — sufficiently strong total, shared core and reciprocity, without a serious boundary conflict;
- `hold` — interesting but not yet convincing enough to interrupt two people;
- `reject` — too weak or structurally conflicted.

The existence of `hold` is important. Bond should be allowed to say **not yet** rather than turning every candidate into content.

## Connection Hypothesis

The lab produces a deterministic draft explanation from the score structure. It is deliberately plain.

A future AI-written Connection Hypothesis should only be allowed after the structured pair evaluation passes threshold. The language model should explain an already-grounded edge, not invent the edge itself.

A future hypothesis generator must:

- use only evidence permitted for explanation;
- never reveal sensitive private onboarding material without explicit consent;
- avoid numerical compatibility language;
- explain both shared core and useful difference;
- mention uncertainty when reciprocity is not well-supported;
- survive a separate critic step before release.

## Adversarial critic — next step

Before a real introduction, a second evaluator should try to answer:

> Why should these two people **not** be introduced?

It should look for superficial similarity, asymmetric value, duplicated social worlds, boundary conflicts, weak timing, forced novelty, and an explanation that sounds better than the evidence actually is.

Only pairs that survive the critic should be candidates for a user-facing Connection Hypothesis.

## Why synthetic candidates first

Synthetic candidates let us deliberately construct difficult cases:

- same profession but wrong social intention;
- little surface overlap but strong reciprocal complementarity;
- very high similarity with low novelty;
- productive difference with a strong shared core;
- one-sided usefulness;
- explicit `Not this` conflicts.

The purpose of the Matching Lab is therefore not to demonstrate that Bond can always find a match. It is to expose where the engine makes bad decisions while those decisions are still cheap to fix.
