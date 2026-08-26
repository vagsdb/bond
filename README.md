# Bond

Bond is the working repository for **Serendipity v0.1** — a human encounter engine designed to find people who might matter to each other without turning people into a browseable marketplace.

The product is intentionally unlike conventional social or dating software: no feed, no swiping, no follower graph, no popularity ranking, and no artificial matching quota.

## GitHub Pages

Bond is configured as a static Next.js export and includes an automated GitHub Pages workflow.

**Target public URL:** `https://vagsdb.github.io/bond/`

For a new repository, GitHub requires one repository-level setting before the first deployment:

1. Open **Settings → Pages**.
2. Under **Build and deployment → Source**, select **GitHub Actions**.
3. Open **Actions** and run **Deploy Bond to GitHub Pages** once if a deployment has not started automatically.

After that, pushes to `main` publish automatically.

## Current prototype

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

## Run locally

```bash
npm install
npm run dev
```

Then open `http://localhost:3000`.

## Production build

```bash
npm run build
```

Next.js exports the static Pages site to `out/`.

## v0.1 build sequence

1. Product constitution ✅
2. Eye-smooth web shell and GitHub Pages deployment ✅
3. Conversational onboarding ✅
4. Structured private human model ✅
5. Want / Not This / social intention model ✅
6. Progressive commitment + hidden detailed model ✅
7. Candidate retrieval
8. Shared-core + interesting-divergence scorer
9. Reciprocity evaluation
10. Adversarial match critic
11. AI-written Connection Hypothesis
12. Introduction state machine and expiry
13. Mutual reveal
14. Pair-specific opening experiment
15. Messaging
16. Outcome collection
17. Closed same-city pilot

## Core hypothesis

> Can AI-curated shared-core/productive-divergence introductions create more “I’m glad we met” outcomes than conventional similarity-based matching?

See [`PRODUCT_CONSTITUTION.md`](./PRODUCT_CONSTITUTION.md) for the non-negotiable design rules and [`docs/PRIVATE_HUMAN_MODEL.md`](./docs/PRIVATE_HUMAN_MODEL.md) for the current local model design.
