import type { HumanModel } from "../human-model";

export type UserId = string;

export type SemanticDimension =
  | "curiosity"
  | "desired_exposure"
  | "conversation_style"
  | "temperament"
  | "wants"
  | "not_this"
  | "social_intention"
  | "life_chapter";

export type EvidenceVisibility = "private" | "explanation_eligible";

export type SemanticSegment = {
  id: string;
  dimension: SemanticDimension;
  text: string;
  confidence: "direct" | "tentative" | "unknown";
  visibility: EvidenceVisibility;
  embedding?: number[];
};

export type SemanticProfile = {
  version: 2;
  userId?: UserId;
  city: string;
  adultConfirmed: boolean;
  segments: SemanticSegment[];
  activeIntention: string;
  activeIntentionEmbedding?: number[];
  updatedAt: string;
};

export type TrustState = "unverified" | "basic" | "verified" | "restricted";

export type PrivateIdentity = {
  userId: UserId;
  firstName: string;
  age?: number;
  city: string;
  broadWorld?: string;
  photoUrl?: string;
  trustState: TrustState;
};

export type CandidateEligibility = {
  sameCity: boolean;
  adultConfirmed: boolean;
  blocked: boolean;
  alreadyIntroduced: boolean;
  restricted: boolean;
};

export type SemanticCandidate = {
  identity: PrivateIdentity;
  profile: SemanticProfile;
  eligibility: CandidateEligibility;
};

export type RetrievalReason = {
  dimension: SemanticDimension;
  score: number;
  note: string;
};

export type RetrievedCandidate = {
  candidate: SemanticCandidate;
  retrievalScore: number;
  reasons: RetrievalReason[];
};

export type IntroductionDecision = "pending" | "accept" | "decline";

export type IntroductionStatus =
  | "pending"
  | "mutual_accept"
  | "declined"
  | "expired"
  | "conversation_open"
  | "closed";

export type RevealLevel = "hypothesis_only" | "minimal_identity" | "full_conversation";

export type IntroductionSnapshot = {
  id: string;
  userA: UserId;
  userB: UserId;
  status: IntroductionStatus;
  userADecision: IntroductionDecision;
  userBDecision: IntroductionDecision;
  revealLevel: RevealLevel;
  hypothesis: string | null;
  hypothesisReleased: boolean;
  createdAt: string;
  expiresAt: string;
  openedAt?: string;
};

export type OutcomeEventType =
  | "introduction_released"
  | "mutual_accept"
  | "conversation_started"
  | "offline_met"
  | "glad_we_met"
  | "continued_contact"
  | "not_worthwhile"
  | "blocked"
  | "reported";

export type OutcomeEvent = {
  id: string;
  introductionId: string;
  userId?: UserId;
  type: OutcomeEventType;
  value?: number | boolean | string;
  occurredAt: string;
};

export type BondV2User = {
  identity: PrivateIdentity;
  humanModel: HumanModel;
  semanticProfile: SemanticProfile;
};
