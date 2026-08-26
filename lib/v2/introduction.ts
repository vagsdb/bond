import type {
  IntroductionDecision,
  IntroductionSnapshot,
  UserId,
} from "./contracts";

function iso(date: Date) {
  return date.toISOString();
}

export function createIntroduction(input: {
  id: string;
  userA: UserId;
  userB: UserId;
  hypothesis: string;
  now?: Date;
  ttlHours?: number;
}): IntroductionSnapshot {
  const now = input.now ?? new Date();
  const expires = new Date(now.getTime() + (input.ttlHours ?? 48) * 60 * 60 * 1000);

  return {
    id: input.id,
    userA: input.userA,
    userB: input.userB,
    status: "pending",
    userADecision: "pending",
    userBDecision: "pending",
    revealLevel: "hypothesis_only",
    hypothesis: input.hypothesis,
    hypothesisReleased: true,
    createdAt: iso(now),
    expiresAt: iso(expires),
  };
}

export function isExpired(introduction: IntroductionSnapshot, now = new Date()) {
  return now.getTime() >= new Date(introduction.expiresAt).getTime();
}

function applyOutcome(snapshot: IntroductionSnapshot): IntroductionSnapshot {
  if (snapshot.userADecision === "decline" || snapshot.userBDecision === "decline") {
    return {
      ...snapshot,
      status: "declined",
      revealLevel: "hypothesis_only",
    };
  }

  if (snapshot.userADecision === "accept" && snapshot.userBDecision === "accept") {
    return {
      ...snapshot,
      status: "mutual_accept",
      revealLevel: "minimal_identity",
      openedAt: snapshot.openedAt ?? new Date().toISOString(),
    };
  }

  return { ...snapshot, status: "pending", revealLevel: "hypothesis_only" };
}

export function recordDecision(
  introduction: IntroductionSnapshot,
  userId: UserId,
  decision: Exclude<IntroductionDecision, "pending">,
  now = new Date(),
) {
  if (isExpired(introduction, now)) return expireIntroduction(introduction, now);
  if (introduction.status !== "pending") return introduction;

  if (userId !== introduction.userA && userId !== introduction.userB) {
    throw new Error("User is not a participant in this introduction.");
  }

  const next: IntroductionSnapshot = {
    ...introduction,
    userADecision: userId === introduction.userA ? decision : introduction.userADecision,
    userBDecision: userId === introduction.userB ? decision : introduction.userBDecision,
  };

  return applyOutcome(next);
}

export function expireIntroduction(introduction: IntroductionSnapshot, now = new Date()) {
  if (introduction.status !== "pending") return introduction;
  return {
    ...introduction,
    status: "expired" as const,
    revealLevel: "hypothesis_only" as const,
    expiresAt: iso(now),
  };
}

export function openConversation(introduction: IntroductionSnapshot) {
  if (introduction.status !== "mutual_accept") {
    throw new Error("Conversation can open only after mutual acceptance.");
  }
  return {
    ...introduction,
    status: "conversation_open" as const,
    revealLevel: "full_conversation" as const,
  };
}

/**
 * User-facing projection. Neither person's decline becomes a visible rejection object.
 * Once either side says no, the introduction simply disappears from both views.
 */
export function visibleIntroductionFor(
  introduction: IntroductionSnapshot,
  viewerId: UserId,
): Omit<IntroductionSnapshot, "userADecision" | "userBDecision"> & {
  myDecision: IntroductionDecision;
  mutual: boolean;
} | null {
  if (viewerId !== introduction.userA && viewerId !== introduction.userB) return null;
  if (introduction.status === "declined" || introduction.status === "expired" || introduction.status === "closed") return null;

  const myDecision = viewerId === introduction.userA
    ? introduction.userADecision
    : introduction.userBDecision;
  const otherDecision = viewerId === introduction.userA
    ? introduction.userBDecision
    : introduction.userADecision;

  if (myDecision === "decline" || otherDecision === "decline") return null;

  const { userADecision: _a, userBDecision: _b, ...safe } = introduction;
  return {
    ...safe,
    myDecision,
    mutual: introduction.status === "mutual_accept" || introduction.status === "conversation_open",
  };
}
