import type { HumanModel } from "./human-model";
import type { MatchEvaluation } from "./matching";

export type CriticSeverity = "low" | "medium" | "high" | "blocking";

export type CriticFindingCode =
  | "boundary_conflict"
  | "weak_reciprocity"
  | "asymmetric_value"
  | "thin_shared_core"
  | "novelty_without_anchor"
  | "similarity_trap"
  | "weak_timing"
  | "insufficient_evidence"
  | "persuasive_story_risk";

export type CriticFinding = {
  code: CriticFindingCode;
  severity: CriticSeverity;
  label: string;
  explanation: string;
};

export type CriticReview = {
  risk: number;
  verdict: "clear" | "caution" | "oppose";
  findings: CriticFinding[];
  strongestObjection: string;
};

const severityWeight: Record<CriticSeverity, number> = {
  low: 8,
  medium: 18,
  high: 34,
  blocking: 70,
};

function clamp(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function addFinding(
  findings: CriticFinding[],
  code: CriticFindingCode,
  severity: CriticSeverity,
  label: string,
  explanation: string,
) {
  findings.push({ code, severity, label, explanation });
}

function evidenceCount(model: HumanModel) {
  const directStatements = model.onboarding.filter((item) => item.trim().length > 12).length;
  const wants = model.wants.filter((item) => item.trim().length > 4).length;
  const boundaries = model.notThis.filter((item) => item.trim().length > 4).length;
  const intention = model.socialIntention.trim().length > 8 ? 1 : 0;
  return directStatements + wants + boundaries + intention;
}

/**
 * The critic is intentionally not a second proposer.
 * It receives a proposal and tries to falsify it by looking for structural failure modes.
 */
export function criticReview(model: HumanModel, proposal: MatchEvaluation): CriticReview {
  const { breakdown } = proposal;
  const findings: CriticFinding[] = [];

  if (breakdown.boundaryPenalty >= 68) {
    addFinding(
      findings,
      "boundary_conflict",
      "blocking",
      "Explicit boundary conflict",
      "At least one side appears to have asked Bond not to create this kind of encounter. A compelling match story cannot override an explicit boundary.",
    );
  } else if (breakdown.boundaryPenalty >= 34) {
    addFinding(
      findings,
      "boundary_conflict",
      "high",
      "Possible boundary conflict",
      "The candidate overlaps with material in the Not this layer. This needs stronger evidence before an interruption is justified.",
    );
  }

  if (breakdown.reciprocity < 40) {
    addFinding(
      findings,
      "weak_reciprocity",
      "high",
      "Weak reciprocal value",
      "The proposal may be useful to one person without being meaningfully useful to the other.",
    );
  } else if (breakdown.reciprocity < 52) {
    addFinding(
      findings,
      "weak_reciprocity",
      "medium",
      "Reciprocity is not proven",
      "There is some mutual relevance, but not enough to confidently claim that both people gain from the introduction.",
    );
  }

  const directionalGap = Math.abs(breakdown.userToCandidate - breakdown.candidateToUser);
  if (directionalGap >= 42 || Math.min(breakdown.userToCandidate, breakdown.candidateToUser) < 24) {
    addFinding(
      findings,
      "asymmetric_value",
      directionalGap >= 55 ? "high" : "medium",
      "Asymmetric usefulness",
      `The directional reciprocity is imbalanced (${breakdown.userToCandidate} vs ${breakdown.candidateToUser}). Bond should not confuse one-sided usefulness with a reciprocal connection.`,
    );
  }

  if (breakdown.sharedCore < 32) {
    addFinding(
      findings,
      "thin_shared_core",
      "high",
      "Shared core is too thin",
      "Difference is only useful when something meaningful anchors the encounter. The current common ground may be too weak.",
    );
  } else if (breakdown.sharedCore < 42) {
    addFinding(
      findings,
      "thin_shared_core",
      "medium",
      "Shared core remains tentative",
      "The pair may be interesting, but the evidence for a durable common thread is still limited.",
    );
  }

  if (breakdown.interestingDivergence >= 74 && breakdown.sharedCore < 44) {
    addFinding(
      findings,
      "novelty_without_anchor",
      "high",
      "Novelty without an anchor",
      "The proposal may be rewarding difference simply because it is different. Productive divergence needs a stronger shared core.",
    );
  }

  if (breakdown.sharedCore >= 72 && breakdown.interestingDivergence < 52) {
    addFinding(
      findings,
      "similarity_trap",
      "medium",
      "Similarity trap",
      "The pair may simply mirror an existing social world. High similarity is not enough if Bond is adding little that is genuinely new.",
    );
  }

  if (breakdown.intentionFit < 32) {
    addFinding(
      findings,
      "weak_timing",
      "high",
      "Wrong person for right now",
      "Even a structurally interesting pair may be irrelevant to what either person currently wants from their social world.",
    );
  } else if (breakdown.intentionFit < 46) {
    addFinding(
      findings,
      "weak_timing",
      "medium",
      "Timing is weak",
      "The pair has some relevance, but the current social intention does not strongly support an interruption now.",
    );
  }

  if (evidenceCount(model) < 4) {
    addFinding(
      findings,
      "insufficient_evidence",
      "medium",
      "Human model is under-specified",
      "The proposer may be fitting a story to too little user evidence. Bond should prefer waiting over confident interpretation.",
    );
  }

  if (proposal.breakdown.total >= 62 && proposal.reasons.length <= 1) {
    addFinding(
      findings,
      "persuasive_story_risk",
      "medium",
      "Score stronger than its evidence",
      "The aggregate score looks convincing, but the number of independently strong reasons is small. A fluent Connection Hypothesis could overstate the case.",
    );
  }

  const rawRisk = findings.reduce((sum, finding) => sum + severityWeight[finding.severity], 0);
  const risk = clamp(rawRisk);
  const hasBlocking = findings.some((finding) => finding.severity === "blocking");
  const highCount = findings.filter((finding) => finding.severity === "high").length;

  const verdict: CriticReview["verdict"] = hasBlocking || risk >= 68 || highCount >= 2
    ? "oppose"
    : risk >= 28 || highCount === 1
      ? "caution"
      : "clear";

  const strongest = [...findings].sort(
    (a, b) => severityWeight[b.severity] - severityWeight[a.severity],
  )[0];

  return {
    risk,
    verdict,
    findings,
    strongestObjection: strongest
      ? strongest.explanation
      : "The critic found no structural reason strong enough to oppose this proposal.",
  };
}
