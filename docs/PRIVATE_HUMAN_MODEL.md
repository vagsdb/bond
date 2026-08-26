# Private Human Model — v0.1

Bond does not treat a person as a public dating-style profile. The private human model is an internal, user-correctable representation used to decide whether an introduction may be meaningful.

## v0.1 principles

1. **Direct evidence stays direct.** User statements are preserved as the primary evidence.
2. **Inference is explicitly marked.** Tentative interpretations are never presented as facts.
3. **Unknown is a valid state.** Bond should prefer `unknown` over inventing personality claims from insufficient evidence.
4. **Want and Not This have equal weight.** The model records both desired exposure and social saturation/exclusions.
5. **The user can correct the model.** Any future AI extraction layer must support inspection and correction.
6. **The model is private.** Private onboarding evidence must never be copied verbatim into a Connection Hypothesis shown to another person.
7. **Current GitHub Pages prototype is local-first.** The model is stored in the browser using `localStorage`; there is no remote account or server persistence yet.

## Current shape

```text
HumanModel
├── onboarding evidence
├── curiosity
├── desired exposure
├── conversation style
├── temperament
├── wants[]
├── notThis[]
├── socialIntention
└── updatedAt
```

Signals use a confidence state:

- `direct` — explicitly stated by the user
- `tentative` — deterministic first-pass interpretation that should be verified
- `unknown` — insufficient evidence; Bond refuses to guess

## Why deterministic extraction first?

The GitHub Pages build is a static site. Putting a private model-provider API key in browser code would expose that key. Therefore v0.1 uses a transparent deterministic extraction layer plus user correction. A production AI extractor belongs behind an authenticated backend where secrets, consent, deletion, auditability and model-versioning can be controlled.

## Next backend milestone

When a backend is introduced, the extraction contract should return structured signals with:

```json
{
  "dimension": "conversation_style",
  "value": "depth-seeking",
  "confidence": 0.74,
  "evidence_ids": ["onboarding:1", "onboarding:2"],
  "privacy": "private",
  "model_version": "..."
}
```

The matching engine should consume structured signals rather than raw private onboarding transcripts whenever possible.
