# Bond

Bond is a human encounter engine designed to find people who might matter to each other without turning people into a browseable marketplace.

The product is intentionally unlike conventional social or dating software: no feed, no swiping, no follower graph, no popularity ranking, no paid exposure, and no artificial matching quota.

> **Do not show people more people. Find the one person they would not have known to look for.**

## Public prototype

Bond is configured as a static Next.js export and deploys to GitHub Pages:

`https://vagsdb.github.io/bond/`

The public prototype remains deliberately quiet:

1. three conversational questions;
2. **What I think I heard** reflection;
3. **More of this / Not this**;
4. one current social intention;
5. **I'm looking** — no people browser;
6. inspectable private human model behind the experience.

The GitHub Pages prototype stores its model in the user's browser with `localStorage`. It does not pretend a production AI/backend exists where none is deployed.

## Matching Engine v1.1 ✅

The completed first decision engine is:

```text
candidate
   ↓
PROPOSER
   ↓
ADVERSARIAL CRITIC
   ↓
DETERMINISTIC FINAL GATE
   ├── reject
   ├── hold
   └── introduce
```

The proposer reasons over shared core, interesting divergence, directional reciprocity, current intention and boundaries. The critic independently attacks weak reciprocity, asymmetric value, thin common ground, novelty without an anchor, similarity traps, timing, insufficient evidence, boundary conflicts and persuasive-story risk.

Only deterministic software releases an introduction.

Internal lab:

`https://vagsdb.github.io/bond/lab/`

## Bond v2.0 — real-product foundation 🚧

v2.0 extends the architecture from **reasoning about a pair** toward **creating and learning from a real encounter**.

```text
Private Human Model
        ↓
Multi-dimensional semantic profile
        ↓
Hard eligibility
        ↓
Semantic retrieval
        ↓
Proposer
        ↓
Critic
        ↓
Deterministic gate
        ↓
Hypothesis privacy review
        ↓
Independent mutual acceptance
        ↓
Progressive reveal
        ↓
Pair conversation / offline encounter
        ↓
Outcome learning
```

### Implemented in the repository

- multi-dimensional semantic profile contract;
- vector-ready semantic segments;
- retrieval layer with hard eligibility and multi-dimension scoring;
- compatibility with real embeddings plus lexical fallback for the static lab;
- Connection Hypothesis privacy gate;
- 48-hour introduction state machine;
- independent `accept / decline` decisions;
- invisible rejection projection;
- mutual-only minimal identity reveal;
- conversation-open transition;
- meaningful-encounter outcome trajectory;
- Meaningful Encounter Rate utility;
- Supabase/Postgres schema;
- pgvector-ready semantic storage;
- Row Level Security;
- blocks and reports;
- masked introduction RPC;
- decision RPC that never exposes the other person's response;
- service-role-only vector candidate pool;
- v2 Systems Lab.

v2 Systems Lab:

`https://vagsdb.github.io/bond/v2/`

The `/v2/` route is still a **local diagnostic simulation using synthetic candidates**. It proves the software interfaces from semantic retrieval through outcome learning without converting the public product into a people browser.

### What is not yet production-live

GitHub Pages cannot safely provide server secrets, production authentication, private database storage, embedding generation, service-role vector retrieval, real-time messaging or an AI provider.

Therefore these require a separately deployed backend before a real-user pilot:

- Supabase project deployment;
- real authentication;
- real-user population;
- server-side embedding generation;
- server-side multi-vector retrieval;
- production AI proposer/critic/hypothesis generation;
- real-time messaging;
- production abuse/safety operations.

The migration is ready at:

`supabase/migrations/20260826_bond_v2.sql`

See [`docs/V2_BACKEND_SETUP.md`](./docs/V2_BACKEND_SETUP.md) for deployment requirements.

## v2 semantic representation

A person is not reduced to one vector. Bond can represent separate semantic spaces for:

- curiosity;
- desired exposure;
- conversation style;
- temperament;
- wants;
- `Not this`;
- current social intention;
- later life-chapter context.

The intended production architecture is:

```text
deterministic constraints
        ↓
multi-vector retrieval
        ↓
pairwise proposer
        ↓
adversarial critic
        ↓
deterministic release gate
```

`Not this` primarily functions as a boundary/exclusion layer rather than a signal that retrieves more of the unwanted thing.

## Outcome philosophy

Bond should not learn from attention metrics as its primary target.

The trajectory of interest is:

```text
introduction
→ mutual acceptance
→ conversation
→ offline meeting
→ glad we met
→ continued contact
```

The north-star metric remains:

> **Meaningful Encounter Rate = worthwhile encounters / introductions released**

## Run locally

```bash
npm install
npm run dev
```

Then open:

- Bond: `http://localhost:3000`
- Matching Lab: `http://localhost:3000/lab/`
- v2 Systems Lab: `http://localhost:3000/v2/`

## Production build

```bash
npm run build
```

Next.js statically exports the GitHub Pages prototype to `out/`.

## Current milestone map

1. Product constitution ✅
2. Quiet public UX ✅
3. Conversational onboarding ✅
4. Private human model ✅
5. Want / Not This / social intention ✅
6. Matching Engine v1.1: proposer → critic → gate ✅
7. v2 multi-dimensional semantic profile ✅
8. v2 semantic retrieval contract ✅
9. v2 hypothesis privacy gate ✅
10. v2 mutual introduction state machine ✅
11. v2 progressive reveal contract ✅
12. v2 outcome-learning model ✅
13. Supabase/Postgres + pgvector + RLS schema ✅
14. v2 local Systems Lab ✅
15. Deploy production backend ⬜
16. Real authentication + real users ⬜
17. Embedding service + server retrieval ⬜
18. Production AI proposer / critic / hypothesis ⬜
19. Real-time pair messaging ⬜
20. Closed Athens pilot ⬜
21. Measure Meaningful Encounter Rate ⬜

## Core invariant

> **AI may propose. AI may criticize. Deterministic software controls release.**

See [`PRODUCT_CONSTITUTION.md`](./PRODUCT_CONSTITUTION.md), [`docs/MATCHING_MODEL.md`](./docs/MATCHING_MODEL.md), [`docs/V1_1_ACCEPTANCE.md`](./docs/V1_1_ACCEPTANCE.md), [`docs/V2_ARCHITECTURE.md`](./docs/V2_ARCHITECTURE.md), and [`docs/V2_BACKEND_SETUP.md`](./docs/V2_BACKEND_SETUP.md).
