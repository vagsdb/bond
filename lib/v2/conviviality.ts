import type { HumanModel, HumanSignal } from "../human-model";

export type ConvivialityReading = {
  signal: HumanSignal;
  strength: "unknown" | "present" | "strong";
  cues: string[];
};

const EXPLICIT = [
  "convivial", "conviviality", "hospitality", "hospitable", "communal",
  "συντροφικότητα", "συντροφικοτητα", "παρεΐστικ", "παρειστικ", "φιλοξενία", "φιλοξενια",
];

const WARM_CUES: Array<[string, string]> = [
  ["warm", "warmth"], ["welcoming", "welcome"], ["playful", "playfulness"],
  ["laugh", "laughter"], ["dinner", "shared table"], ["table", "shared table"],
  ["coffee", "coffee"], ["walk", "walking together"], ["small group", "small groups"],
  ["small groups", "small groups"], ["friends", "friendship"], ["company", "company"],
  ["together", "togetherness"], ["conversation", "conversation"], ["music", "shared music"],
  ["food", "shared food"], ["relaxed", "ease"], ["easy", "ease"], ["hosting", "hosting"],
  ["παρέα", "παρέα"], ["παρεα", "παρέα"], ["ζεστασιά", "ζεστασιά"], ["ζεστασια", "ζεστασιά"],
  ["κουβέντα", "κουβέντα"], ["κουβεντα", "κουβέντα"], ["γέλιο", "γέλιο"], ["γελιο", "γέλιο"],
  ["χαλαρ", "χαλαρότητα"], ["τραπέζι", "κοινό τραπέζι"], ["τραπεζι", "κοινό τραπέζι"],
  ["καφέ", "καφές"], ["καφε", "καφές"], ["βόλτα", "βόλτα"], ["βολτα", "βόλτα"],
  ["φαγητό", "κοινό φαγητό"], ["φαγητο", "κοινό φαγητό"],
];

const QUIET_CUES = [
  "one-to-one", "one to one", "small group", "small groups", "quiet", "calm", "comfortable with silence",
  "ένας προς έναν", "ενας προς εναν", "μικρή παρέα", "μικρη παρεα", "ήρεμ", "ηρεμ",
];

const TRANSACTIONAL_CUES = [
  "networking", "pitching", "transactional", "status-driven", "status games", "competitive", "cofounder",
  "επαγγελματική δικτύωση", "επαγγελματικη δικτυωση", "ανταγωνιστικ", "status",
];

function normalize(value: string) {
  return value.toLowerCase().normalize("NFKD").replace(/\p{M}/gu, "");
}

function unique(values: string[]) {
  return [...new Set(values)];
}

/**
 * Conviviality is treated as a social atmosphere signal, not a personality diagnosis.
 * Direct confidence is reserved for explicit language. Otherwise the inference remains tentative.
 */
export function inferConviviality(texts: string[]): ConvivialityReading {
  const source = texts.filter(Boolean).join(" · ");
  const normalized = normalize(source);

  const explicit = EXPLICIT.some((cue) => normalized.includes(normalize(cue)));
  const warm = unique(
    WARM_CUES
      .filter(([cue]) => normalized.includes(normalize(cue)))
      .map(([, label]) => label),
  );
  const quiet = QUIET_CUES.some((cue) => normalized.includes(normalize(cue)));
  const transactional = TRANSACTIONAL_CUES.filter((cue) => normalized.includes(normalize(cue))).length;

  const evidenceStrength = warm.length - Math.min(transactional, 2);

  if (!explicit && evidenceStrength <= 0) {
    return {
      strength: "unknown",
      cues: [],
      signal: {
        label: "Still unclear",
        evidence: "I do not yet have enough evidence to infer whether conviviality — easy, warm shared social atmosphere — matters in the encounters you enjoy.",
        confidence: "unknown",
      },
    };
  }

  const strength: ConvivialityReading["strength"] = explicit || evidenceStrength >= 3 ? "strong" : "present";
  const atmosphere = quiet ? "Quiet conviviality" : strength === "strong" ? "Warm conviviality" : "Conviviality";
  const cueText = warm.length ? warm.slice(0, 4).join(", ") : "your explicit wording";

  return {
    strength,
    cues: warm,
    signal: {
      label: atmosphere,
      evidence: `I am sensing a preference for social ease and shared presence rather than purely transactional contact. Current cues: ${cueText}. Treat this as a revisable social-atmosphere signal, not a fixed trait.`,
      confidence: explicit ? "direct" : "tentative",
    },
  };
}

export function inferConvivialityFromHumanModel(model: HumanModel) {
  return inferConviviality([
    ...model.onboarding,
    model.curiosity.evidence,
    model.desiredExposure.evidence,
    model.conversationStyle.label,
    model.conversationStyle.evidence,
    model.temperament.label,
    model.temperament.evidence,
    ...model.wants,
    ...model.notThis,
    model.socialIntention,
  ]);
}
