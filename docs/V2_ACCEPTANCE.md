# Bond v2.0 Acceptance Criteria

v2.0 is split into two gates so the repository does not confuse **implemented architecture** with a **live social product**.

## Gate A — v2 software foundation

- [x] Multi-dimensional semantic profile
- [x] Separate curiosity, desired-exposure, conversation-style, temperament, wants, Not-this and intention segments
- [x] Explanation eligibility attached to semantic evidence
- [x] Vector-ready segment contract
- [x] Hard candidate eligibility before semantic retrieval
- [x] Multi-dimensional candidate retrieval
- [x] Retrieval remains separate from matching/release
- [x] Existing proposer → critic → deterministic gate preserved
- [x] Hypothesis privacy review after final matching gate
- [x] Independent mutual acceptance state machine
- [x] 48-hour introduction expiry contract
- [x] Invisible rejection projection
- [x] Minimal identity only after mutual yes
- [x] Conversation-open transition
- [x] Pair-opening contract represented in the systems flow
- [x] Meaningful-encounter outcome events
- [x] Meaningful Encounter Rate utility
- [x] Supabase/Postgres schema
- [x] pgvector-ready semantic storage
- [x] RLS on private user/model tables
- [x] blocks and reports
- [x] masked visible-introduction RPC
- [x] private decision RPC
- [x] service-role-only candidate vector pool
- [x] local `/v2/` end-to-end systems simulation
- [x] current public Bond experience remains no-browse

## Gate B — real-user v2 pilot

v2 is **not a real-user product release** until all of these are complete:

- [ ] Dedicated Supabase project deployed
- [ ] Migration applied and reviewed
- [ ] Authentication configured
- [ ] 18+ enforcement implemented server-side
- [ ] User export/delete flow
- [ ] Embedding provider selected and dimensionality locked
- [ ] Server-side embedding jobs
- [ ] Server-side multi-vector retrieval
- [ ] Real-user candidate hydration without browser profile enumeration
- [ ] Production proposer service
- [ ] Independent production critic service
- [ ] Deterministic final gate executed server-side
- [ ] Privacy-safe AI Connection Hypothesis generator
- [ ] Hypothesis privacy regression tests
- [ ] Real introduction delivery
- [ ] Rejection-invisibility integration tests
- [ ] Real-time pair messaging
- [ ] rate limiting and spam/abuse controls
- [ ] block/report review workflow
- [ ] audit logging for serious moderation events
- [ ] backup/recovery plan
- [ ] pilot privacy policy and terms
- [ ] closed Athens pilot cohort
- [ ] pre-specified Meaningful Encounter Rate analysis

## Release language

Until Gate B is complete, describe the current state as:

> **Bond v2.0 software foundation / systems prototype**

Do not describe it as a production social network or a live real-user matching service.

## Invariant

Every later v2 implementation must preserve:

> **AI may propose. AI may criticize. Deterministic software controls release.**

And every product metric must remain subordinate to:

> **Does this increase the probability of a worthwhile human encounter without increasing unnecessary attention capture?**
