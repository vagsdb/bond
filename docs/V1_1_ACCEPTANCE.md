# Bond Matching Engine v1.1 — Acceptance Criteria

v1.1 is considered complete when all of the following are true.

## Architecture

- [x] The proposer and critic are separate modules.
- [x] The proposer attempts to construct the strongest evidence-grounded case for an introduction.
- [x] The critic attempts to falsify the proposal rather than optimize it.
- [x] A deterministic final gate has sole authority to return `introduce`, `hold`, or `reject`.
- [x] Explicit boundaries can veto a high proposer score.
- [x] `hold` remains a first-class state.

## Reciprocity

- [x] Reciprocity is not represented by one aggregate value alone.
- [x] The engine exposes `user → candidate` and `candidate → user` directional values.
- [x] Strong asymmetry can trigger a critic finding.
- [x] Both directions must clear a minimum before an introduction can be released.

## Critic failure modes

- [x] Boundary conflict
- [x] Weak reciprocity
- [x] Asymmetric usefulness
- [x] Thin shared core
- [x] Novelty without an anchor
- [x] Similarity trap
- [x] Weak current-intention/timing fit
- [x] Insufficient human-model evidence
- [x] Persuasive-story risk

## Connection Hypothesis

- [x] The proposer may construct an internal draft hypothesis.
- [x] `hold` and `reject` do not expose a Connection Hypothesis to the hypothetical user.
- [x] Only `finalDecision === "introduce"` makes the hypothesis eligible for a later privacy review.
- [x] Numerical compatibility language remains internal to the diagnostic lab.

## Matching Lab

- [x] The lab clearly separates proposer, critic, and final threshold.
- [x] Critic findings have code, severity, explanation, risk, and verdict.
- [x] Final-gate reasons are visible.
- [x] Synthetic profiles remain clearly marked as synthetic.
- [x] The public Bond home experience remains a no-browse experience.

## Language and privacy

- [x] First-pass matching uses Unicode-safe tokenization.
- [x] English and Greek semantic-theme heuristics are supported for the Athens prototype.
- [x] The v1.1 lab reads the existing browser-local human model and does not create a second profile.

## Deliberately outside v1.1

These are subsequent product layers, not missing parts of the v1.1 decision engine:

- production authentication/database;
- real-user candidate retrieval;
- embeddings/learned reranking;
- AI-written privacy-safe Connection Hypothesis;
- introduction expiry and mutual acceptance;
- reveal mechanics;
- messaging;
- outcome learning;
- production safety/abuse tooling.

The invariant going forward is:

> **AI may propose. AI may criticize. Deterministic software controls release.**
