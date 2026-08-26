import type { HumanModel } from "./human-model";
import { criticReview, type CriticReview } from "./critic";
import {
  evaluateCandidate,
  type CandidateProfile,
  type MatchEvaluation,
} from "./matching";

export type FinalDecision = "introduce" | "hold" | "reject";

export type PipelineEvaluation = {
  candidate: CandidateProfile;
  proposal: MatchEvaluation;
  critic: CriticReview;
  finalDecision: FinalDecision;
  survivalScore: number;
  gateReasons: string[];
  connectionHypothesis: string | null;
};

function clamp(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function hasSeverity(critic: CriticReview, severity: "high" | "blocking") {
  return critic.findings.some((finding) => finding.severity === severity);
}

/**
 * Final gate. The proposer can recommend; the critic can object; neither gets authority alone.
 * Explicit boundaries and blocking objections always outrank aggregate scores.
 */
export function finalGate(proposal: MatchEvaluation, critic: CriticReview) {
  const b = proposal.breakdown;
  const gateReasons: string[] = [];

  if (b.boundaryPenalty >= 68 || hasSeverity(critic, "blocking")) {
    gateReasons.push("explicit boundary or blocking critic objection");
    return { finalDecision: "reject" as const, gateReasons };
  }

  if (proposal.decision === "reject" && proposal.breakdown.total < 42) {
    gateReasons.push("proposer evidence is below the minimum interruption threshold");
    return { finalDecision: "reject" as const, gateReasons };
  }

  if (critic.verdict === "oppose" || critic.risk >= 68) {
    gateReasons.push("critic found structural risk strong enough to oppose the introduction");
    return { finalDecision: "reject" as const, gateReasons };
  }

  const directionalMinimum = Math.min(b.userToCandidate, b.candidateToUser);
  const introductionReady =
    b.total >= 62 &&
    b.sharedCore >= 40 &&
    b.reciprocity >= 52 &&
    directionalMinimum >= 30 &&
    b.intentionFit >= 42 &&
    critic.risk <= 27 &&
    !hasSeverity(critic, "high");

  if (introductionReady) {
    gateReasons.push("proposal cleared minimum shared-core and reciprocity evidence");
    gateReasons.push("both directional value estimates are above the minimum");
    gateReasons.push("critic found no high-severity structural objection");
    return { finalDecision: "introduce" as const, gateReasons };
  }

  if (b.total < 42 || b.sharedCore < 28 || b.reciprocity < 34) {
    gateReasons.push("the pair is too weak to justify waiting for more evidence");
    return { finalDecision: "reject" as const, gateReasons };
  }

  if (critic.risk > 27) gateReasons.push("critic risk is above the introduction threshold");
  if (b.sharedCore < 40) gateReasons.push("shared core needs stronger evidence");
  if (b.reciprocity < 52) gateReasons.push("reciprocity needs stronger evidence");
  if (directionalMinimum < 30) gateReasons.push("one direction of reciprocal value is too weak");
  if (b.intentionFit < 42) gateReasons.push("current intention fit is not strong enough yet");
  if (b.total < 62) gateReasons.push("proposal strength remains below the interruption threshold");

  return { finalDecision: "hold" as const, gateReasons };
}

export function evaluatePipeline(model: HumanModel, candidate: CandidateProfile): PipelineEvaluation {
  const proposal = evaluateCandidate(model, candidate);
  const critic = criticReview(model, proposal);
  const { finalDecision, gateReasons } = finalGate(proposal, critic);
  const survivalScore = clamp(proposal.breakdown.total - critic.risk * 0.35);

  return {
    candidate,
    proposal,
    critic,
    finalDecision,
    survivalScore,
    gateReasons,
    connectionHypothesis: finalDecision === "introduce" ? proposal.hypothesis : null,
  };
}

const decisionRank: Record<FinalDecision, number> = {
  introduce: 3,
  hold: 2,
  reject: 1,
};

export function rankPipeline(model: HumanModel, candidates: CandidateProfile[]) {
  return candidates
    .map((candidate) => evaluatePipeline(model, candidate))
    .sort((a, b) => {
      const decisionDelta = decisionRank[b.finalDecision] - decisionRank[a.finalDecision];
      if (decisionDelta) return decisionDelta;
      return b.survivalScore - a.survivalScore;
    });
}
