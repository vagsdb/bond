import type { HumanModel } from "../human-model";
import type { CandidateProfile } from "../matching";

export type PairOpening = {
  prompt: string;
  rationale: string;
  mode: "contrast" | "shared_observation" | "teach_each_other" | "open_curiosity";
};

function hasAny(text: string, terms: string[]) {
  const value = text.toLowerCase();
  return terms.some((term) => value.includes(term));
}

export function buildPairOpening(model: HumanModel, candidate: CandidateProfile): PairOpening {
  const userText = [...model.onboarding, ...model.wants, model.socialIntention].join(" ");
  const candidateText = [candidate.world, ...candidate.curiosity, ...candidate.wants, candidate.intention].join(" ");
  const combined = `${userText} ${candidateText}`;

  if (hasAny(combined, ["athens", "city", "urban", "street", "place", "architecture", "photography"])) {
    return {
      mode: "shared_observation",
      prompt: "Each choose one place in Athens that most people pass without really seeing. Give only the place first, then explain why after you have both answered.",
      rationale: "The pair appears to share attention to place while noticing it through different lenses.",
    };
  }

  if (hasAny(combined, ["science", "biology", "medicine", "engineering", "repair", "craft", "mechanism", "technology"])) {
    return {
      mode: "teach_each_other",
      prompt: "Choose one thing from your world that looks ordinary from the outside but becomes fascinating once you understand how it works. Explain it without professional jargon.",
      rationale: "The introduction connects different mechanism-oriented or technical worlds.",
    };
  }

  if (hasAny(combined, ["art", "music", "film", "book", "culture", "history", "archive", "design"])) {
    return {
      mode: "contrast",
      prompt: "Each name one work, object or idea you care about that you suspect the other person would not have encountered on their own. Wait until both have answered before explaining your choice.",
      rationale: "The pair appears to have cultural curiosity with useful distance between their reference worlds.",
    };
  }

  return {
    mode: "open_curiosity",
    prompt: "What is something you have become unusually interested in that would sound trivial if you described it badly? Each answer before asking the other person why.",
    rationale: "The opening surfaces current curiosity instead of forcing generic small talk.",
  };
}
