import type { HumanModel } from "../human-model";
import { evaluateCandidate, type CandidateProfile } from "../matching";
import { rankPipeline } from "../matching-pipeline";

export type CounterfactualCandidate = {
  candidateId: string;
  firstName: string;
  similarityScore: number;
};

function clamp(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

/**
 * Deliberately simple baseline: reward commonality + current intention and penalize
 * boundaries, without rewarding productive divergence or requiring the critic.
 * This is not a recommended matcher; it is the control condition Bond should beat.
 */
export function rankSimilarityBaseline(model: HumanModel, candidates: CandidateProfile[]) {
  return candidates
    .map((candidate): CounterfactualCandidate => {
      const proposal = evaluateCandidate(model, candidate);
      return {
        candidateId: candidate.id,
        firstName: candidate.firstName,
        similarityScore: clamp(
          proposal.breakdown.sharedCore * 0.7 +
          proposal.breakdown.intentionFit * 0.3 -
          proposal.breakdown.boundaryPenalty * 0.5,
        ),
      };
    })
    .sort((a, b) => b.similarityScore - a.similarityScore);
}

export function compareMatchingPolicies(model: HumanModel, candidates: CandidateProfile[]) {
  const similarity = rankSimilarityBaseline(model, candidates);
  const bond = rankPipeline(model, candidates);
  const bondTop = bond[0] ?? null;
  const similarityTop = similarity[0] ?? null;

  return {
    bondTop,
    similarityTop,
    sameTopCandidate: Boolean(
      bondTop && similarityTop && bondTop.candidate.id === similarityTop.candidateId,
    ),
    bondRanking: bond,
    similarityRanking: similarity,
  };
}
