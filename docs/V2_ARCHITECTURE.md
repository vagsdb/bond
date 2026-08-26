# Bond v2.0 Architecture

Bond v2.0 moves the project from a browser-local matching prototype toward a real human encounter system while preserving the v1.1 safety invariant:

> **AI may propose. AI may criticize. Deterministic software controls release.**

## Product pipeline

```text
Authenticated real user
        ↓
Private evolving Human Model
        ↓
Multi-dimensional semantic profile
        ↓
Hard eligibility filters
        ↓
Semantic candidate retrieval
        ↓
Proposer
        ↓
Adversarial critic
        ↓
Deterministic release gate
        ↓
Privacy review of Connection Hypothesis
        ↓
Independent mutual acceptance
        ↓
Progressive identity reveal
        ↓
Pair-specific opening
        ↓
Conversation / offline encounter
        ↓
Outcome learning
```

## 1. Multi-dimensional semantic profile

A person is not represented by one profile string or one compatibility number.

v2 has separate semantic dimensions for:

- curiosity;
- desired exposure;
- conversation style;
- temperament;
- wants;
- `Not this`;
- current social intention;
- future life-chapter context.

Each semantic segment has confidence and a visibility class. Raw onboarding evidence and exclusions remain private. Only explicitly explanation-eligible evidence may enter the later Connection Hypothesis context.

This allows candidate retrieval to ask questions such as:

- similar curiosity, different professional world;
- strong current-intention fit;
- conversational compatibility without occupational similarity;
- a desired difference that is reciprocal rather than one-sided.

## 2. Retrieval is not matching

Retrieval answers only:

> **Which people are worth expensive pair reasoning?**

It never decides who should be introduced.

The production retrieval path is intended to be:

```text
same city + adult + trust + block/exclusion filters
                  ↓
vector search across multiple semantic dimensions
                  ↓
small candidate pool
                  ↓
v1.1 proposer → critic → deterministic gate
```

The local v2 Systems Lab uses lexical fallback signals because no embedding service is connected to GitHub Pages. The retrieval contract already supports numeric embeddings when a backend provides them.

## 3. Privacy before prose

A final matching decision does not automatically authorize an explanation.

The v2 hypothesis layer separately checks:

- final decision is `introduce`;
- a hypothesis exists;
- raw private onboarding text is not reproduced verbatim;
- `Not this` text is not exposed verbatim;
- explanation-eligible evidence exists.

The production AI hypothesis generator should receive a deliberately reduced explanation context rather than the entire private human model.

## 4. Mutual acceptance and invisible rejection

Every introduction begins at `hypothesis_only` reveal level.

Each side decides independently:

```text
pending + pending
accept  + pending  → still pending
accept  + accept   → mutual_accept
any decline        → declined internally
```

A decline by the other person is not exposed as rejection. The user-facing projection simply removes the introduction.

Only mutual acceptance permits `minimal_identity`. Conversation opening permits `full_conversation`.

## 5. Outcome learning

Bond does not optimize for messages, session length, likes, or retention.

v2 outcome events include:

```text
introduction_released
mutual_accept
conversation_started
offline_met
glad_we_met
continued_contact
not_worthwhile
blocked
reported
```

The primary trajectory of interest is:

```text
introduction → mutual acceptance → conversation → offline meeting → glad-we-met → continued contact
```

The north-star denominator is **introductions released**, not app sessions.

## 6. Data architecture

The Supabase migration creates:

- `profiles`
- `human_models`
- `semantic_segments`
- `intentions`
- `exclusions`
- `blocks`
- `introductions`
- `introduction_decisions`
- `conversations`
- `messages`
- `outcomes`
- `reports`

Private model tables are owner-only under Row Level Security. Candidate vector retrieval is service-role only. Users never receive another person's private semantic segments.

Direct reads of `introductions` are intentionally not granted. A security-definer RPC provides a masked user-facing projection so the other person's pending/decline state cannot leak.

## 7. What the `/v2/` route is

`/v2/` is a systems laboratory, not a public people browser.

It currently proves the interfaces between:

1. local human model;
2. multi-dimensional semantic profile;
3. semantic shortlist;
4. proposer/critic/gate;
5. hypothesis privacy review;
6. mutual acceptance state machine;
7. minimal reveal;
8. outcome trajectory.

Synthetic candidates remain in this lab until a production backend is connected.

## 8. Production boundary

The repository now contains the v2 software architecture and database schema, but GitHub Pages cannot itself provide:

- secure server secrets;
- real authentication;
- private database storage;
- embedding generation;
- server-side candidate retrieval;
- real-time messaging;
- abuse review infrastructure.

Those require a deployed backend. Supabase/Postgres is the current target.

## v2 invariant

Bond should become more intelligent without becoming more permissive.

A stronger model should improve evidence quality. It must not weaken boundaries, reciprocity requirements, privacy review, or the deterministic release gate.
