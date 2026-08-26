# Bond Matching Engine v1.1

Bond v1.1 makes the first complete decision architecture explicit:

```text
candidate retrieval
       ↓
PROPOSER
       ↓
ADVERSARIAL CRITIC
       ↓
FINAL THRESHOLD
   ↙      ↓       ↘
reject   hold   introduce
                  ↓
Connection Hypothesis becomes eligible
```

The engine remains intentionally **deterministic, inspectable, bilingual-aware, and conservative**. The purpose is not to claim that hand-written rules are the final intelligence layer; it is to make Bond's assumptions falsifiable before a language model or learned recommender can hide them inside persuasive output.

## Public product vs internal lab

The public Bond experience does **not** show people to browse and does **not** show compatibility percentages.

The internal Matching Lab may expose numerical components because it is a diagnostic instrument. Those values are developer evidence, not social currency.

The lab currently runs against synthetic Athens candidate profiles. No real users are exposed.

---

## Stage 1 — Proposer

The proposer asks:

> What is the strongest evidence-grounded reason these two people might matter to each other?

Each pair is evaluated across:

1. **Shared core** — meaningful overlap in curiosity, conversational orientation, culture, place, making, learning, depth, or other latent themes.
2. **Interesting divergence** — difference that could add a new world rather than merely create incompatibility.
3. **Reciprocity** — whether each person appears to offer something the other has asked for.
4. **Directional reciprocity** — reciprocity is decomposed into `user → candidate` and `candidate → user`, so a strong aggregate cannot hide a one-sided connection.
5. **Current intention fit** — whether the introduction is relevant to what both people want now.
6. **Boundary penalty** — conflicts with `Not this` preferences or reciprocal exclusions.

The proposer diagnostic total remains:

```text
0.28 × shared core
+ 0.22 × interesting divergence
+ 0.27 × reciprocity
+ 0.23 × current intention fit
− 0.38 × boundary penalty
```

This formula is a testable hypothesis, not product truth.

The proposer may return an optimistic preliminary recommendation and a draft Connection Hypothesis. Neither is allowed to reach users yet.

---

## Stage 2 — Adversarial critic

The critic has a different objective:

> Find the strongest reason this introduction is a mistake.

It is deliberately not a second proposer and does not try to improve the proposal.

The current structured critic checks include:

- `boundary_conflict` — explicit or probable conflict with `Not this`;
- `weak_reciprocity` — aggregate mutual value is too low;
- `asymmetric_value` — one directional reciprocity estimate is much stronger than the other;
- `thin_shared_core` — novelty lacks sufficient common ground;
- `novelty_without_anchor` — difference is being rewarded simply because it is different;
- `similarity_trap` — high similarity may reproduce an existing social world without adding much;
- `weak_timing` — the pair may be interesting in general but irrelevant to current intentions;
- `insufficient_evidence` — the human model is too sparse for a confident interruption;
- `persuasive_story_risk` — the aggregate score sounds stronger than the number of independent positive reasons.

Each finding has a severity:

```text
low → medium → high → blocking
```

The critic combines them into a diagnostic risk and a verdict:

```text
clear | caution | oppose
```

A blocking objection can never be rescued by a high proposer score.

---

## Stage 3 — Final threshold

Neither proposer nor critic gets authority alone.

The final gate enforces the principle:

> Is there enough surviving evidence to justify interrupting two people's lives?

### Hard rejection

The current gate rejects when any of the following is true:

- explicit boundary penalty reaches the blocking range;
- the critic finds a blocking objection;
- the proposal is below the minimum evidence floor;
- critic risk/opposition is structurally too strong.

### Introduction eligibility

The current v1.1 gate requires all of the following:

```text
proposer total ≥ 62
shared core ≥ 40
aggregate reciprocity ≥ 52
both directional reciprocity values ≥ 30
current intention fit ≥ 42
critic risk ≤ 27
no high-severity critic finding
```

These numbers are intentionally visible and changeable during experimentation. They are not universal psychological constants.

### Hold

`hold` is a first-class outcome.

A pair can be interesting without being ready. The gate may hold because:

- shared core needs stronger evidence;
- reciprocity is not yet convincing;
- one direction of value is weak;
- timing is uncertain;
- critic risk remains above the release threshold;
- proposal strength is promising but below interruption threshold.

Bond should be allowed to say **not yet**.

---

## Survival score

The lab ranks candidates using an internal survival score after criticism:

```text
survival score = proposer total − 0.35 × critic risk
```

Final decision class outranks survival score in sorting: `introduce` candidates appear before `hold`, which appear before `reject`.

This number is diagnostic only and must never become a user-facing compatibility score.

---

## Connection Hypothesis release rule

The proposer can draft a plausible explanation for many pairs. v1.1 deliberately separates **ability to tell a good story** from **permission to show that story**.

A Connection Hypothesis becomes eligible only when:

```text
finalDecision === "introduce"
```

For `hold` and `reject`, the lab explicitly withholds it from the hypothetical user.

This is a core safeguard:

> Good prose must never rescue a weak match.

The current deterministic hypothesis is still only a debug draft. A future AI-written hypothesis must additionally pass privacy and safety review and use only evidence approved for disclosure.

---

## Language handling

The Athens prototype uses Unicode-safe tokenization and includes first-pass English/Greek semantic themes. Greek input should not be discarded simply because it contains non-Latin characters.

This is still heuristic bilingual support, not full semantic multilingual understanding. A production embedding/reranking layer should later replace these lexical theme rules while preserving the same inspectable decision stages.

---

## Why synthetic candidates first

Synthetic candidates let us deliberately construct difficult cases:

- same profession but wrong social intention;
- little surface overlap but strong reciprocal complementarity;
- very high similarity with low novelty;
- productive difference with a strong shared core;
- one-sided usefulness;
- explicit `Not this` conflicts;
- a proposer that is excited but a critic that correctly vetoes;
- a promising candidate that should be held rather than rejected.

The goal of the Matching Lab is not to demonstrate that Bond can always find a match. It is to expose bad decisions while those decisions are still cheap to fix.

---

## Next intelligence layer

v1.1 completes the deterministic decision architecture. The next layer should not remove it.

Future AI can improve:

- semantic profile extraction;
- multilingual candidate retrieval;
- nuanced proposer reasoning;
- adversarial critic reasoning;
- privacy-safe Connection Hypothesis writing.

But the architecture should remain:

```text
AI may propose.
AI may criticize.
Deterministic software controls the release gate.
```
