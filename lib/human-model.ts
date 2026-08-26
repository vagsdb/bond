export type SignalConfidence = "direct" | "tentative" | "unknown";

export type HumanSignal = {
  label: string;
  evidence: string;
  confidence: SignalConfidence;
};

export type HumanModel = {
  version: 1;
  onboarding: string[];
  curiosity: HumanSignal;
  desiredExposure: HumanSignal;
  conversationStyle: HumanSignal;
  temperament: HumanSignal;
  wants: string[];
  notThis: string[];
  socialIntention: string;
  updatedAt: string;
};

const clean = (value: string | undefined) => (value ?? "").trim();

function containsAny(text: string, terms: string[]) {
  const haystack = text.toLowerCase();
  return terms.some((term) => haystack.includes(term));
}

function inferConversationStyle(text: string): HumanSignal {
  const value = clean(text);
  if (!value) {
    return {
      label: "Still learning",
      evidence: "Bond needs more conversational evidence before making a claim.",
      confidence: "unknown",
    };
  }

  if (containsAny(value, ["deep", "long conversation", "debate", "challenge", "ideas", "philosoph"])) {
    return {
      label: "Depth-seeking",
      evidence: value,
      confidence: "tentative",
    };
  }

  if (containsAny(value, ["funny", "humor", "laugh", "playful", "lighthearted"])) {
    return {
      label: "Playful and exploratory",
      evidence: value,
      confidence: "tentative",
    };
  }

  return {
    label: "Open-ended",
    evidence: value,
    confidence: "tentative",
  };
}

function inferTemperament(text: string): HumanSignal {
  const value = clean(text);
  if (!value) {
    return {
      label: "Still learning",
      evidence: "Bond has not collected enough direct evidence yet.",
      confidence: "unknown",
    };
  }

  if (containsAny(value, ["quiet", "calm", "reserved", "introvert", "small group", "one-to-one"])) {
    return { label: "Quietly social", evidence: value, confidence: "tentative" };
  }

  if (containsAny(value, ["spontaneous", "adventure", "unexpected", "wander", "explore"])) {
    return { label: "Exploratory", evidence: value, confidence: "tentative" };
  }

  return {
    label: "Not classified yet",
    evidence: "Bond will wait for stronger evidence instead of guessing.",
    confidence: "unknown",
  };
}

export function buildInitialHumanModel(messages: string[]): HumanModel {
  const curiosity = clean(messages[0]);
  const desired = clean(messages[1]);
  const saturated = clean(messages[2]);

  return {
    version: 1,
    onboarding: messages,
    curiosity: {
      label: curiosity ? "Current curiosity" : "Still learning",
      evidence: curiosity || "No direct evidence yet.",
      confidence: curiosity ? "direct" : "unknown",
    },
    desiredExposure: {
      label: desired ? "Desired social difference" : "Still learning",
      evidence: desired || "No direct evidence yet.",
      confidence: desired ? "direct" : "unknown",
    },
    conversationStyle: inferConversationStyle(`${curiosity} ${desired}`),
    temperament: inferTemperament(`${curiosity} ${desired}`),
    wants: desired ? [desired] : [],
    notThis: saturated ? [saturated] : [],
    socialIntention: desired,
    updatedAt: new Date().toISOString(),
  };
}

export function updateHumanModel(model: HumanModel, patch: Partial<HumanModel>): HumanModel {
  return {
    ...model,
    ...patch,
    updatedAt: new Date().toISOString(),
  };
}
