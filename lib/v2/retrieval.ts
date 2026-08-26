import type { CandidateProfile } from "../matching";
import { inferConviviality } from "./conviviality";
import type {
  CandidateEligibility,
  RetrievedCandidate,
  SemanticCandidate,
  SemanticDimension,
  SemanticProfile,
} from "./contracts";

const DEFAULT_WEIGHTS: Record<SemanticDimension, number> = {
  curiosity: 0.2,
  desired_exposure: 0.16,
  conversation_style: 0.12,
  temperament: 0.06,
  conviviality: 0.1,
  wants: 0.15,
  not_this: 0,
  social_intention: 0.21,
  life_chapter: 0,
};

function normalize(value: string) {
  return value.toLowerCase().normalize("NFKD").replace(/\p{M}/gu, "");
}

function tokens(value: string) {
  return new Set(
    normalize(value)
      .replace(/[^\p{L}\p{N}\s-]/gu, " ")
      .split(/\s+/)
      .filter((token) => token.length > 2),
  );
}

function textSimilarity(a: string, b: string) {
  const left = tokens(a);
  const right = tokens(b);
  if (!left.size || !right.size) return 0;
  let intersection = 0;
  left.forEach((token) => {
    if (right.has(token)) intersection += 1;
  });
  return intersection / Math.max(left.size, right.size);
}

function cosine(a: number[], b: number[]) {
  if (!a.length || a.length !== b.length) return 0;
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let index = 0; index < a.length; index += 1) {
    dot += a[index] * b[index];
    normA += a[index] ** 2;
    normB += b[index] ** 2;
  }
  if (!normA || !normB) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

function dimensionScore(
  user: SemanticProfile,
  candidate: SemanticProfile,
  dimension: SemanticDimension,
) {
  const userSegments = user.segments.filter((item) => item.dimension === dimension);
  const candidateSegments = candidate.segments.filter((item) => item.dimension === dimension);
  if (!userSegments.length || !candidateSegments.length) return 0;

  let best = 0;
  for (const left of userSegments) {
    for (const right of candidateSegments) {
      const vector = left.embedding && right.embedding
        ? Math.max(0, cosine(left.embedding, right.embedding))
        : 0;
      const lexical = textSimilarity(left.text, right.text);
      best = Math.max(best, vector, lexical);
    }
  }
  return best;
}

export function isEligible(eligibility: CandidateEligibility) {
  return (
    eligibility.sameCity &&
    eligibility.adultConfirmed &&
    !eligibility.blocked &&
    !eligibility.alreadyIntroduced &&
    !eligibility.restricted
  );
}

/**
 * Multi-vector retrieval is deliberately separate from the proposer.
 * Retrieval answers "who is worth expensive reasoning?" — it never releases an introduction.
 */
export function scoreSemanticCandidate(
  user: SemanticProfile,
  candidate: SemanticCandidate,
  weights = DEFAULT_WEIGHTS,
): RetrievedCandidate | null {
  if (!isEligible(candidate.eligibility)) return null;

  const reasons: RetrievedCandidate["reasons"] = [];
  let weighted = 0;
  let weightTotal = 0;

  (Object.keys(weights) as SemanticDimension[]).forEach((dimension) => {
    const weight = weights[dimension];
    if (weight <= 0) return;
    const score = dimensionScore(user, candidate.profile, dimension);
    weighted += score * weight;
    weightTotal += weight;
    if (score >= 0.18) {
      reasons.push({
        dimension,
        score: Math.round(score * 100),
        note: `retrieval signal in ${dimension.replaceAll("_", " ")}`,
      });
    }
  });

  const retrievalScore = weightTotal ? Math.round((weighted / weightTotal) * 100) : 0;
  return { candidate, retrievalScore, reasons: reasons.sort((a, b) => b.score - a.score) };
}

export function retrieveCandidates(
  user: SemanticProfile,
  candidates: SemanticCandidate[],
  limit = 50,
) {
  return candidates
    .map((candidate) => scoreSemanticCandidate(user, candidate))
    .filter((item): item is RetrievedCandidate => Boolean(item))
    .sort((a, b) => b.retrievalScore - a.retrievalScore)
    .slice(0, limit);
}

export function candidateProfileToSemanticCandidate(
  candidate: CandidateProfile,
  options: Partial<CandidateEligibility> = {},
): SemanticCandidate {
  const now = new Date().toISOString();
  const segment = (
    id: string,
    dimension: SemanticDimension,
    text: string,
  ) => ({
    id,
    dimension,
    text,
    confidence: "direct" as const,
    visibility: "explanation_eligible" as const,
  });

  const conviviality = inferConviviality([
    candidate.world,
    ...candidate.curiosity,
    ...candidate.conversationStyle,
    ...candidate.temperament,
    ...candidate.wants,
    ...candidate.notThis,
    candidate.intention,
    candidate.note,
  ]);

  const convivialitySegments = conviviality.strength === "unknown"
    ? []
    : [
        {
          ...segment(
            "conviviality",
            "conviviality",
            [conviviality.signal.label, ...conviviality.cues].join(" · "),
          ),
          confidence: conviviality.signal.confidence,
        },
      ];

  return {
    identity: {
      userId: candidate.id,
      firstName: candidate.firstName,
      city: candidate.city,
      broadWorld: candidate.world,
      trustState: "basic",
    },
    eligibility: {
      sameCity: candidate.city.toLowerCase() === "athens",
      adultConfirmed: true,
      blocked: false,
      alreadyIntroduced: false,
      restricted: false,
      ...options,
    },
    profile: {
      version: 2,
      userId: candidate.id,
      city: candidate.city,
      adultConfirmed: true,
      activeIntention: candidate.intention,
      updatedAt: now,
      segments: [
        ...candidate.curiosity.map((text, index) => segment(`c-${index}`, "curiosity", text)),
        ...candidate.conversationStyle.map((text, index) => segment(`cs-${index}`, "conversation_style", text)),
        ...candidate.temperament.map((text, index) => segment(`t-${index}`, "temperament", text)),
        ...convivialitySegments,
        ...candidate.wants.map((text, index) => segment(`w-${index}`, "wants", text)),
        ...candidate.notThis.map((text, index) => ({
          ...segment(`n-${index}`, "not_this", text),
          visibility: "private" as const,
        })),
        segment("intent", "social_intention", candidate.intention),
        segment("world", "desired_exposure", candidate.world),
      ],
    },
  };
}
