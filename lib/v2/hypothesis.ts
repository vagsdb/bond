import type { HumanModel } from "../human-model";
import type { SemanticProfile } from "./contracts";
import { explanationContext } from "./semantic-profile";

export type HypothesisReview = {
  eligible: boolean;
  hypothesis: string | null;
  reasons: string[];
  permittedEvidenceIds: string[];
};

function normalize(value: string) {
  return value.toLowerCase().normalize("NFKD").replace(/\p{M}/gu, "").replace(/\s+/g, " ").trim();
}

function containsSensitiveVerbatim(hypothesis: string, model: HumanModel) {
  const text = normalize(hypothesis);
  return model.onboarding.some((statement) => {
    const direct = normalize(statement);
    return direct.length >= 20 && text.includes(direct);
  }) || model.notThis.some((statement) => {
    const direct = normalize(statement);
    return direct.length >= 14 && text.includes(direct);
  });
}

/**
 * v2 keeps generation and release separate. Even a final-gate-approved pair must pass
 * this privacy layer before prose can be shown to either person.
 */
export function reviewConnectionHypothesis(input: {
  draft: string | null;
  model: HumanModel;
  semanticProfile: SemanticProfile;
  finalDecision: "introduce" | "hold" | "reject";
}) : HypothesisReview {
  const reasons: string[] = [];
  const permitted = explanationContext(input.semanticProfile);

  if (input.finalDecision !== "introduce") {
    reasons.push("final matching gate did not release the pair");
  }

  if (!input.draft?.trim()) {
    reasons.push("no hypothesis draft exists");
  }

  if (input.draft && containsSensitiveVerbatim(input.draft, input.model)) {
    reasons.push("draft contains verbatim private onboarding or Not this material");
  }

  if (!permitted.length) {
    reasons.push("no explanation-eligible evidence is available");
  }

  const eligible = reasons.length === 0;
  return {
    eligible,
    hypothesis: eligible ? input.draft!.trim() : null,
    reasons,
    permittedEvidenceIds: permitted.map((item) => item.id),
  };
}
