# Bond

Bond is the working repository for **Serendipity v0.1** — an AI-mediated human encounter engine.

The product is intentionally unlike conventional social or dating software: no feed, no swiping, no follower graph, no popularity ranking, and no artificial matching quota.

## Current prototype

The first runnable prototype contains:

- landing experience
- conversational onboarding shell
- explicit anti-attention product philosophy
- sparse waiting state: **“I’m looking.”**

The current onboarding is intentionally local and deterministic. The next implementation step is to replace the fixed prompts with a real AI onboarding service that extracts a private structured human model.

## Run locally

```bash
npm install
npm run dev
```

Then open `http://localhost:3000`.

## v0.1 build sequence

1. Product constitution
2. Web shell and UX prototype
3. Conversational onboarding
4. Structured private human model
5. Want / Not This / social intention model
6. Candidate retrieval
7. Shared-core + interesting-divergence scorer
8. Reciprocity evaluation
9. Adversarial match critic
10. AI-written Connection Hypothesis
11. Introduction state machine and expiry
12. Mutual reveal
13. Pair-specific opening experiment
14. Messaging
15. Outcome collection
16. Closed same-city pilot

## Core hypothesis

> Can AI-curated shared-core/productive-divergence introductions create more “I’m glad we met” outcomes than conventional similarity-based matching?

See [`PRODUCT_CONSTITUTION.md`](./PRODUCT_CONSTITUTION.md) for the non-negotiable design rules.
