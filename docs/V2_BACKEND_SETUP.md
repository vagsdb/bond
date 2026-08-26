# Bond v2.0 Backend Setup

The repository now contains the v2 database migrations, but the production backend is **not deployed by GitHub Pages**.

GitHub Pages should continue to host the static prototype. Real users require a separate private backend.

## Target stack

- **Frontend:** Next.js / React
- **Database/Auth/Realtime:** Supabase
- **Database:** PostgreSQL
- **Vector search:** pgvector
- **Matching:** server-side Bond pipeline
- **AI:** server-side only; provider keys never go into the browser

## 1. Create a dedicated Supabase project

Use a project dedicated to Bond. Do not reuse an unrelated clinical, research, or personal database.

Record:

- Project URL
- public anon/publishable key
- service-role key (server-only)

The service-role key must never be committed to GitHub or exposed to the browser.

## 2. Apply the migrations

Apply all files in `supabase/migrations/` in filename order. The current v2 set is:

```text
20260826_bond_v2.sql
20260826_bond_v2_reveal.sql
```

The first migration enables `pgcrypto` and `vector`, creates the v2 data model, enables RLS, and installs masked introduction/decision functions.

The second adds the narrow mutual-reveal RPC and the server-controlled transition that opens a pair conversation without weakening profile privacy.

## 3. Configure authentication

Initial pilot recommendation:

- email magic link or OTP;
- 18+ confirmation during onboarding;
- verified email before the signal can become active;
- optional stronger identity verification later.

For a GitHub Pages prototype, configure the allowed redirect URL to the deployed Bond URL. A production app should move to a proper application domain before a closed pilot.

## 4. Public vs server environment

Browser-safe values:

```text
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
```

Server-only values:

```text
SUPABASE_SERVICE_ROLE_KEY
AI_PROVIDER_API_KEY
```

A static GitHub Pages export cannot safely execute service-role or AI code. Candidate retrieval, embedding generation, proposer/critic AI calls, and introduction creation therefore belong in a deployed server/edge layer.

## 5. Embedding pipeline

For every active human model, generate separate embeddings for at least:

- curiosity;
- desired exposure;
- conversation style;
- wants;
- current social intention.

`Not this` should primarily behave as an exclusion/boundary layer, not as a vector that retrieves more of the thing the person does not want.

Store embeddings in `semantic_segments.embedding` and the active intention vector in `intentions.embedding`.

The migration uses `vector(1536)` as the initial storage contract. If the chosen embedding model has another dimensionality, change the migration before applying it to production rather than silently truncating or padding vectors.

## 6. Retrieval service

The browser must not download a population of private profiles.

The server should:

1. verify the authenticated user;
2. load the active semantic vectors;
3. enforce same-city, adult, trust, block and previous-introduction filters;
4. call the service-role-only candidate-vector function;
5. combine multiple vector neighborhoods;
6. fetch private candidate models server-side;
7. run proposer → critic → deterministic gate;
8. run hypothesis privacy review;
9. create an `introductions` row only for final `introduce` results.

## 7. Introduction delivery

The authenticated client reads introductions only through the masked `bond_visible_introductions()` RPC.

This is deliberate:

- the other person's pending decision is not visible;
- their decline is not visible;
- identity remains hidden before mutual acceptance;
- only mutual acceptance releases the other participant ID/minimal profile.

Record decisions through `bond_record_decision()`.

After mutual acceptance, obtain the deliberately narrow identity projection through `bond_revealed_profile()`. Direct reads of another user's private `profiles`, human model or semantic segments remain forbidden.

## 8. Messaging

Conversation creation should occur only after `mutual_accept`.

Use `bond_open_conversation()` to create/reuse the pair conversation and transition the introduction to `conversation_open`. That transition upgrades reveal level without making the private profile tables broadly readable.

RLS then permits only the two participants to read/write messages.

## 9. Outcome learning

Do not use message count, session duration or notification opens as the primary training target.

Collect sparse explicit/behavioral outcome events:

- mutual acceptance;
- conversation started;
- offline meeting;
- glad-we-met rating;
- continued contact;
- not worthwhile;
- block/report.

Use these to evaluate introductions and matching policies offline before changing production thresholds.

## 10. Pilot release gate

Before inviting real users, verify at minimum:

- RLS tests for every private table;
- rejection invisibility tests;
- block symmetry tests;
- no candidate enumeration from the browser;
- hypothesis privacy tests;
- mutual reveal cannot expose a non-participant;
- conversation opening requires mutual acceptance;
- account deletion/export path;
- rate limiting;
- report review workflow;
- database backups;
- privacy policy / terms appropriate to the pilot.

The v2 repository is the software foundation. A real-user pilot begins only after this backend is deployed and these checks pass.
