import type { HumanModel } from "../human-model";
import { updateHumanModel } from "../human-model";

export type RevisionField = "socialIntention" | "wants" | "notThis";
export type RevisionStatus = "pending" | "accepted" | "rejected";

export type ModelRevisionProposal = {
  id: string;
  field: RevisionField;
  previousValue: string | string[];
  proposedValue: string | string[];
  reason: string;
  confidence: "tentative" | "strong";
  status: RevisionStatus;
  createdAt: string;
};

export function proposeModelRevision(input: {
  field: RevisionField;
  previousValue: string | string[];
  proposedValue: string | string[];
  reason: string;
  confidence?: "tentative" | "strong";
}): ModelRevisionProposal {
  return {
    id: `${input.field}:${Date.now()}`,
    field: input.field,
    previousValue: input.previousValue,
    proposedValue: input.proposedValue,
    reason: input.reason,
    confidence: input.confidence ?? "tentative",
    status: "pending",
    createdAt: new Date().toISOString(),
  };
}

/**
 * Bond may propose that its understanding is stale; it may not silently rewrite
 * user-authored wants, exclusions or current intention.
 */
export function resolveModelRevision(
  model: HumanModel,
  proposal: ModelRevisionProposal,
  decision: "accept" | "reject",
) {
  if (proposal.status !== "pending") {
    return { model, proposal };
  }

  if (decision === "reject") {
    return {
      model,
      proposal: { ...proposal, status: "rejected" as const },
    };
  }

  const patch: Partial<HumanModel> = {};
  if (proposal.field === "socialIntention" && typeof proposal.proposedValue === "string") {
    patch.socialIntention = proposal.proposedValue;
  }
  if (proposal.field === "wants" && Array.isArray(proposal.proposedValue)) {
    patch.wants = proposal.proposedValue;
  }
  if (proposal.field === "notThis" && Array.isArray(proposal.proposedValue)) {
    patch.notThis = proposal.proposedValue;
  }

  return {
    model: updateHumanModel(model, patch),
    proposal: { ...proposal, status: "accepted" as const },
  };
}

export function shouldReconfirmIntention(model: HumanModel, now = new Date(), maxAgeDays = 45) {
  const updated = new Date(model.updatedAt);
  if (Number.isNaN(updated.getTime())) return true;
  const ageMs = now.getTime() - updated.getTime();
  return ageMs >= maxAgeDays * 24 * 60 * 60 * 1000;
}
