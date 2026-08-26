import type { HumanModel } from "./human-model";

export type CandidateProfile = {
  id: string;
  firstName: string;
  city: string;
  world: string;
  curiosity: string[];
  conversationStyle: string[];
  temperament: string[];
  wants: string[];
  notThis: string[];
  intention: string;
  note: string;
};

export type MatchBreakdown = {
  sharedCore: number;
  interestingDivergence: number;
  reciprocity: number;
  intentionFit: number;
  boundaryPenalty: number;
  total: number;
};

export type MatchEvaluation = {
  candidate: CandidateProfile;
  breakdown: MatchBreakdown;
  decision: "introduce" | "hold" | "reject";
  reasons: string[];
  cautions: string[];
  hypothesis: string;
};

const STOPWORDS = new Set([
  "a", "an", "and", "are", "as", "at", "be", "because", "but", "by", "for", "from",
  "i", "in", "is", "it", "me", "my", "of", "on", "or", "that", "the", "their", "them",
  "they", "this", "to", "we", "who", "with", "would", "you", "your", "someone", "people",
  "person", "more", "want", "like", "meet", "kind", "really", "something", "things",
  "και", "να", "το", "τα", "τη", "την", "της", "του", "των", "σε", "στο", "στη", "στην",
  "με", "για", "απο", "που", "πως", "ειναι", "ενα", "μια", "εναν", "μου", "σου", "τους",
  "τις", "τον", "δεν", "θα", "πολυ", "κατι", "καποιον", "καποια", "ανθρωπο", "ανθρωπους",
]);

const THEMES: Record<string, string[]> = {
  depth: [
    "deep", "long", "ideas", "philosophy", "meaning", "question", "curious", "intellectual", "think",
    "βαθυ", "βαθια", "ιδεες", "φιλοσοφ", "νοημα", "ερωτη", "περιεργ", "διανοητ", "σκεψη",
  ],
  challenge: [
    "challenge", "different", "disagree", "unexpected", "surprise", "opposite", "outside",
    "προκλη", "διαφορετ", "διαφων", "απροσδοκ", "εκπληξ", "αντιθετ", "εκτος",
  ],
  visual: [
    "visual", "photography", "design", "architecture", "image", "art", "film",
    "οπτικ", "φωτογραφ", "σχεδιασ", "αρχιτεκτον", "εικονα", "τεχνη", "σινεμα",
  ],
  science: [
    "science", "biology", "research", "medicine", "medical", "technology", "engineering",
    "επιστημ", "βιολογ", "ερευν", "ιατρικ", "τεχνολογ", "μηχανικ",
  ],
  city: [
    "city", "urban", "street", "walk", "wander", "athens", "place", "neighborhood",
    "πολη", "αστικ", "δρομο", "περπατ", "βολο", "αθηνα", "μερος", "γειτονια",
  ],
  culture: [
    "music", "book", "literature", "museum", "exhibition", "culture", "cinema", "art",
    "μουσικ", "βιβλι", "λογοτεχν", "μουσει", "εκθεσ", "πολιτισ", "σινεμα", "τεχνη",
  ],
  making: [
    "make", "build", "craft", "create", "maker", "restore", "design",
    "φτιαχν", "κατασκευ", "χειροτεχν", "δημιουργ", "επισκευ", "σχεδιασ",
  ],
  quiet: [
    "quiet", "reserved", "calm", "one-to-one", "small group", "slow",
    "ησυχ", "εσωστρεφ", "ηρεμ", "ενας προς εναν", "μικρη ομαδα", "αργ",
  ],
  play: [
    "funny", "humor", "playful", "strange", "absurd", "laugh",
    "αστει", "χιουμορ", "παιχνιδ", "παραξεν", "παραλογ", "γελιο",
  ],
  learning: [
    "learn", "teach", "explain", "discover", "new", "unknown", "curiosity",
    "μαθ", "διδασκ", "εξηγ", "ανακαλυψ", "καινουργ", "αγνωστ", "περιεργ",
  ],
};

function clamp(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function normalizeText(value: string) {
  return value.toLowerCase().normalize("NFKD").replace(/\p{M}/gu, "");
}

function textOfModel(model: HumanModel) {
  return [
    ...model.onboarding,
    model.curiosity.label,
    model.curiosity.evidence,
    model.desiredExposure.label,
    model.desiredExposure.evidence,
    model.conversationStyle.label,
    model.conversationStyle.evidence,
    model.temperament.label,
    model.temperament.evidence,
    ...model.wants,
    ...model.notThis,
    model.socialIntention,
  ].join(" ");
}

function textOfCandidate(candidate: CandidateProfile) {
  return [
    candidate.world,
    ...candidate.curiosity,
    ...candidate.conversationStyle,
    ...candidate.temperament,
    ...candidate.wants,
    ...candidate.notThis,
    candidate.intention,
    candidate.note,
  ].join(" ");
}

function tokens(value: string) {
  return new Set(
    normalizeText(value)
      .replace(/[^\p{L}\p{N}\s-]/gu, " ")
      .split(/\s+/)
      .map((token) => token.replace(/^-|-$/g, ""))
      .filter((token) => token.length > 2 && !STOPWORDS.has(token)),
  );
}

function overlapScore(a: string, b: string) {
  const left = tokens(a);
  const right = tokens(b);
  if (!left.size || !right.size) return 0;
  let intersection = 0;
  left.forEach((token) => {
    if (right.has(token)) intersection += 1;
  });
  const denominator = Math.sqrt(left.size * right.size);
  return denominator ? (intersection / denominator) * 100 : 0;
}

function themeSet(text: string) {
  const lower = normalizeText(text);
  return Object.entries(THEMES)
    .filter(([, terms]) => terms.some((term) => lower.includes(normalizeText(term))))
    .map(([theme]) => theme);
}

function sharedThemeScore(a: string, b: string) {
  const left = new Set(themeSet(a));
  const right = new Set(themeSet(b));
  if (!left.size || !right.size) return 0;
  let shared = 0;
  left.forEach((theme) => {
    if (right.has(theme)) shared += 1;
  });
  return (shared / Math.max(1, Math.min(left.size, right.size))) * 100;
}

function divergenceScore(model: HumanModel, candidate: CandidateProfile) {
  const desired = normalizeText([...model.wants, model.desiredExposure.evidence, model.socialIntention].join(" "));
  const candidateText = normalizeText(textOfCandidate(candidate));
  const sameWorldPenalty = model.notThis.some((item) => candidateText.includes(normalizeText(item))) ? 35 : 0;
  const explicitDifference = [
    "outside", "different", "new", "opposite", "challenge", "surprise",
    "εκτος", "διαφορετ", "καινουργ", "αντιθετ", "προκλη", "εκπληξ",
  ].some((term) => desired.includes(term));
  const crossWorld = overlapScore(model.curiosity.evidence, candidate.world) < 18 ? 72 : 44;
  const noveltyBoost = explicitDifference ? 18 : 8;
  return clamp(crossWorld + noveltyBoost - sameWorldPenalty);
}

function boundaryPenalty(model: HumanModel, candidate: CandidateProfile) {
  const candidateText = normalizeText(textOfCandidate(candidate));
  const userBoundaryHits = model.notThis.filter((item) => {
    const meaningful = [...tokens(item)];
    return meaningful.some((token) => candidateText.includes(token));
  }).length;

  const userText = normalizeText(textOfModel(model));
  const candidateBoundaryHits = candidate.notThis.filter((item) => {
    const meaningful = [...tokens(item)];
    return meaningful.some((token) => userText.includes(token));
  }).length;

  return clamp((userBoundaryHits + candidateBoundaryHits) * 34);
}

function reciprocalScore(model: HumanModel, candidate: CandidateProfile) {
  const userOffers = [model.curiosity.evidence, ...model.onboarding, ...model.wants].join(" ");
  const candidateNeeds = [...candidate.wants, candidate.intention].join(" ");
  const candidateOffers = [candidate.world, ...candidate.curiosity, ...candidate.conversationStyle].join(" ");
  const userNeeds = [...model.wants, model.socialIntention, model.desiredExposure.evidence].join(" ");

  const aToB = Math.max(overlapScore(userOffers, candidateNeeds), sharedThemeScore(userOffers, candidateNeeds));
  const bToA = Math.max(overlapScore(candidateOffers, userNeeds), sharedThemeScore(candidateOffers, userNeeds));
  const balance = 100 - Math.abs(aToB - bToA);
  return clamp(aToB * 0.4 + bToA * 0.4 + balance * 0.2);
}

function intentionScore(model: HumanModel, candidate: CandidateProfile) {
  const userIntent = model.socialIntention || model.desiredExposure.evidence;
  const candidateIntent = candidate.intention;
  const candidateText = textOfCandidate(candidate);
  const userText = textOfModel(model);

  return clamp(
    Math.max(overlapScore(userIntent, candidateText), sharedThemeScore(userIntent, candidateText)) * 0.55 +
    Math.max(overlapScore(candidateIntent, userText), sharedThemeScore(candidateIntent, userText)) * 0.45,
  );
}

function buildHypothesis(model: HumanModel, candidate: CandidateProfile, score: MatchBreakdown) {
  const core = score.sharedCore >= 55
    ? "There seems to be a real shared core in how you approach curiosity and conversation"
    : "There is a quieter shared thread in the kinds of things that hold your attention";

  const difference = score.interestingDivergence >= 65
    ? `but ${candidate.firstName} comes at it from a noticeably different world: ${candidate.world}`
    : `and ${candidate.firstName}'s world — ${candidate.world} — may add a useful angle rather than simply mirror yours`;

  const reciprocity = score.reciprocity >= 58
    ? "The useful part is that this does not look one-sided: each of you appears to offer something the other has explicitly asked for."
    : "The reciprocity is not fully proven yet, so I would treat this as a hypothesis rather than a confident introduction.";

  return `${core}, ${difference}. ${reciprocity}`;
}

export function evaluateCandidate(model: HumanModel, candidate: CandidateProfile): MatchEvaluation {
  const userText = textOfModel(model);
  const candidateText = textOfCandidate(candidate);

  const lexicalCore = overlapScore(userText, candidateText);
  const thematicCore = sharedThemeScore(userText, candidateText);
  const sharedCore = clamp(lexicalCore * 0.35 + thematicCore * 0.65);
  const interestingDivergence = divergenceScore(model, candidate);
  const reciprocity = reciprocalScore(model, candidate);
  const intentionFit = intentionScore(model, candidate);
  const penalty = boundaryPenalty(model, candidate);

  const raw =
    sharedCore * 0.28 +
    interestingDivergence * 0.22 +
    reciprocity * 0.27 +
    intentionFit * 0.23 -
    penalty * 0.38;

  const total = clamp(raw);
  const reasons: string[] = [];
  const cautions: string[] = [];

  if (sharedCore >= 50) reasons.push("meaningful shared core");
  if (interestingDivergence >= 65) reasons.push("productive difference");
  if (reciprocity >= 58) reasons.push("reciprocal value");
  if (intentionFit >= 50) reasons.push("current intention fit");

  if (penalty >= 34) cautions.push("possible boundary conflict");
  if (reciprocity < 45) cautions.push("weak reciprocity");
  if (sharedCore < 35) cautions.push("shared core may be too thin");

  let decision: MatchEvaluation["decision"] = "hold";
  if (penalty >= 68 || total < 42) decision = "reject";
  else if (total >= 62 && reciprocity >= 52 && sharedCore >= 40) decision = "introduce";

  const breakdown: MatchBreakdown = {
    sharedCore,
    interestingDivergence,
    reciprocity,
    intentionFit,
    boundaryPenalty: penalty,
    total,
  };

  return {
    candidate,
    breakdown,
    decision,
    reasons,
    cautions,
    hypothesis: buildHypothesis(model, candidate, breakdown),
  };
}

export function rankCandidates(model: HumanModel, candidates: CandidateProfile[]) {
  return candidates
    .map((candidate) => evaluateCandidate(model, candidate))
    .sort((a, b) => b.breakdown.total - a.breakdown.total);
}
