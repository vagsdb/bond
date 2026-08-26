import type { HumanModel, HumanSignal } from "../human-model";
import type { SemanticDimension, SemanticProfile, SemanticSegment } from "./contracts";
import { inferConvivialityFromHumanModel } from "./conviviality";

function segment(
  id: string,
  dimension: SemanticDimension,
  text: string,
  confidence: HumanSignal["confidence"],
  explanationEligible = false,
): SemanticSegment | null {
  const clean = text.trim();
  if (!clean) return null;
  return {
    id,
    dimension,
    text: clean,
    confidence,
    visibility: explanationEligible ? "explanation_eligible" : "private",
  };
}

function listSegments(
  dimension: SemanticDimension,
  values: string[],
  prefix: string,
  explanationEligible: boolean,
) {
  return values
    .map((value, index) =>
      segment(`${prefix}-${index + 1}`, dimension, value, "direct", explanationEligible),
    )
    .filter((value): value is SemanticSegment => Boolean(value));
}

/**
 * Converts the current browser-local HumanModel into the v2 multi-representation profile.
 * Raw onboarding evidence stays private. User-authored wants and current intention may be
 * eligible to inform a Connection Hypothesis, but the hypothesis layer still performs a
 * separate privacy review before anything can be released.
 */
export function buildSemanticProfile(
  model: HumanModel,
  options: { city?: string; userId?: string; adultConfirmed?: boolean } = {},
): SemanticProfile {
  const segments: SemanticSegment[] = [];

  const curiosity = segment(
    "curiosity",
    "curiosity",
    model.curiosity.evidence,
    model.curiosity.confidence,
  );
  if (curiosity) segments.push(curiosity);

  const exposure = segment(
    "desired-exposure",
    "desired_exposure",
    model.desiredExposure.evidence,
    model.desiredExposure.confidence,
    true,
  );
  if (exposure) segments.push(exposure);

  const conversation = segment(
    "conversation-style",
    "conversation_style",
    model.conversationStyle.label,
    model.conversationStyle.confidence,
    true,
  );
  if (conversation) segments.push(conversation);

  const temperament = segment(
    "temperament",
    "temperament",
    model.temperament.label,
    model.temperament.confidence,
  );
  if (temperament) segments.push(temperament);

  const conviviality = inferConvivialityFromHumanModel(model);
  if (conviviality.strength !== "unknown") {
    const convivialitySegment = segment(
      "conviviality",
      "conviviality",
      [conviviality.signal.label, ...conviviality.cues].join(" · "),
      conviviality.signal.confidence,
      true,
    );
    if (convivialitySegment) segments.push(convivialitySegment);
  }

  segments.push(...listSegments("wants", model.wants, "want", true));
  segments.push(...listSegments("not_this", model.notThis, "not-this", false));

  const intention = segment(
    "social-intention",
    "social_intention",
    model.socialIntention,
    "direct",
    true,
  );
  if (intention) segments.push(intention);

  return {
    version: 2,
    userId: options.userId,
    city: options.city ?? "Athens",
    adultConfirmed: options.adultConfirmed ?? true,
    segments,
    activeIntention: model.socialIntention.trim(),
    updatedAt: new Date().toISOString(),
  };
}

export function segmentsByDimension(profile: SemanticProfile, dimension: SemanticDimension) {
  return profile.segments.filter((item) => item.dimension === dimension);
}

export function semanticText(profile: SemanticProfile, dimensions?: SemanticDimension[]) {
  const allowed = dimensions ? new Set(dimensions) : null;
  return profile.segments
    .filter((item) => !allowed || allowed.has(item.dimension))
    .map((item) => item.text)
    .join(" ");
}

export function explanationContext(profile: SemanticProfile) {
  return profile.segments
    .filter((item) => item.visibility === "explanation_eligible")
    .map((item) => ({
      id: item.id,
      dimension: item.dimension,
      text: item.text,
      confidence: item.confidence,
    }));
}
