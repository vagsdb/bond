# Bond

Bond is the working repository for **Serendipity v0.1** — a human encounter engine designed to find people who might matter to each other without turning people into a browseable marketplace.

The product is intentionally unlike conventional social or dating software: no feed, no swiping, no follower graph, no popularity ranking, and no artificial matching quota.

## GitHub Pages

Bond is configured as a static Next.js export and includes an automated GitHub Pages workflow.

**Public prototype:** `https://vagsdb.github.io/bond/`

For a new repository, GitHub requires one repository-level setting before the first deployment:

1. Open **Settings → Pages**.
2. Under **Build and deployment → Source**, select **GitHub Actions**.
3. Open **Actions** and run **Deploy Bond to GitHub Pages** once if a deployment has not started automatically.

After that, pushes to `main` publish automatically.

## Current public prototype

The current GitHub Pages prototype implements a deliberately low-friction, progressive-commitment flow:

1. **Three conversational questions** — no public profile form.
2. **What I think I heard** — Bond reflects the user's own words back before making inferences.
3. **More of this / Not this** — desire and negative space are equally important.
4. **One social intention** — a standing intention rather than an instant search query.
5. **I'm looking** — no people browser; the interface becomes intentionally quiet.
6. **What Bond understands about me** — the detailed private model exists, but stays behind the experience and remains inspectable/editable.

The interface is designed around progressive disclosure: understand first, reveal later, and only interrupt the user when an introduction has a reason.

### Privacy in this prototype

GitHub Pages is static hosting and cannot securely hold an AI provider secret or production user database. For that reason, v0.1 stores the private human model in the user's own browser using `localStorage`.

The current interpretation layer is deliberately transparent and conservative:

- direct statements remain direct evidence;
- tentative interpretations are explicitly marked tentative;
- the user can correct the model;
- no hidden production AI backend is implied.

A future authenticated backend can replace this local-only layer without changing the product interaction model.

## Bond Matching Engine v1.1

The internal matching engine now uses the complete first decision architecture:

```text
candidate
   ↓
PROPOSER
   ↓
ADVERSARIAL CRITIC
   ↓
FINAL THRESHOLD
   ├── reject
   ├── hold
   └── introduce
          ↓
Connection Hypothesis becomes eligible for privacy review
```

### 1. Proposer

The proposer makes the strongest evidence-grounded case for an encounter using:

- shared core;
- interesting divergence;
- reciprocal value;
- **directional reciprocity** (`you → them` and `them → you`);
- current intention fit;
- `Not this` boundary penalties.

Its diagnostic formula remains explicit and falsifiable. It is not treated as a compatibility truth.

### 2. Adversarial critic

The critic is a separate module whose job is to **falsify the proposal**, not improve it. It searches for:

- explicit boundary conflict;
- weak reciprocity;
- asymmetric usefulness;
- thin shared core;
- novelty without a meaningful anchor;
- similarity traps;
- weak timing/current-intention fit;
- insufficient human-model evidence;
- persuasive-story risk, where a fluent explanation could sound stronger than the evidence.

The critic returns structured findings with severity plus an overall risk and verdict: `clear / caution / oppose`.

### 3. Final threshold

Neither proposer nor critic can authorize an introduction alone. The final gate applies hard constraints and minimum evidence requirements.

Only a pair that clears the final gate can expose a Connection Hypothesis. For `hold` or `reject`, the lab deliberately withholds the hypothesis from the hypothetical user even though the proposer may have been able to write one.

This prevents **good prose from rescuing a weak match**.

## Internal Matching Lab

The diagnostic surface is at:

`https://vagsdb.github.io/bond/lab/`

The lab is **not** a public people browser. It reads the same browser-local Bond model and evaluates it against a deliberately varied set of synthetic Athens profiles.

It exposes proposer strength, critic findings, directional reciprocity, critic risk, survival score, and the final `introduce / hold / reject` gate decision. Numerical values exist only for debugging and experiments; the public Bond experience should never show compatibility percentages.

The matching layer is English/Greek aware for the Athens prototype and uses Unicode-safe tokenization.

## Run locally

```bash
npm install
npm run dev
```

Then open `http://localhost:3000`.

The local Matching Lab is at `http://localhost:3000/lab/`.

## Production build

```bash
npm run build
```

Next.js exports the static Pages site to `out/`.

## Build sequence

1. Product constitution ✅
2. Eye-smooth web shell and GitHub Pages deployment ✅
3. Conversational onboarding ✅
4. Structured private human model ✅
5. Want / Not This / social intention model ✅
6. Progressive commitment + hidden detailed model ✅
7. Synthetic candidate retrieval scaffold ✅
8. Shared-core + interesting-divergence proposer ✅
9. Directional reciprocity + intention + boundary evaluation ✅
10. Adversarial match critic ✅
11. Final `proposer → critic → threshold` gate ✅
12. Internal Matching Lab v1.1 ✅
13. Privacy-safe AI-written Connection Hypothesis
14. Introduction state machine and expiry
15. Mutual reveal
16. Pair-specific opening experiment
17. Messaging
18. Outcome collection and model learning
19. Closed same-city pilot

## Core hypothesis

> Can AI-curated shared-core/productive-divergence introductions create more “I’m glad we met” outcomes than conventional similarity-based matching?

See [`PRODUCT_CONSTITUTION.md`](./PRODUCT_CONSTITUTION.md) for the non-negotiable design rules, [`docs/PRIVATE_HUMAN_MODEL.md`](./docs/PRIVATE_HUMAN_MODEL.md) for the local model design, and [`docs/MATCHING_MODEL.md`](./docs/MATCHING_MODEL.md) for the v1.1 matching architecture.
