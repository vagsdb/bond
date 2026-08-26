import type { OutcomeEvent, OutcomeEventType } from "./contracts";

const EVENT_WEIGHT: Partial<Record<OutcomeEventType, number>> = {
  introduction_released: 2,
  mutual_accept: 8,
  conversation_started: 12,
  offline_met: 25,
  glad_we_met: 35,
  continued_contact: 18,
  not_worthwhile: -35,
  blocked: -70,
  reported: -100,
};

export type EncounterTrajectory = {
  released: boolean;
  mutuallyAccepted: boolean;
  conversationStarted: boolean;
  metOffline: boolean;
  gladWeMet: boolean;
  continuedContact: boolean;
  negative: boolean;
  score: number;
  meaningfulEncounter: boolean;
};

export function createOutcomeEvent(input: Omit<OutcomeEvent, "id" | "occurredAt"> & {
  id?: string;
  occurredAt?: string;
}): OutcomeEvent {
  return {
    ...input,
    id: input.id ?? `${input.introductionId}:${input.type}:${Date.now()}`,
    occurredAt: input.occurredAt ?? new Date().toISOString(),
  };
}

function has(events: OutcomeEvent[], type: OutcomeEventType) {
  return events.some((event) => event.type === type);
}

export function summarizeTrajectory(events: OutcomeEvent[]): EncounterTrajectory {
  const negative = has(events, "not_worthwhile") || has(events, "blocked") || has(events, "reported");
  const raw = events.reduce((sum, event) => {
    const base = EVENT_WEIGHT[event.type] ?? 0;
    if (event.type === "glad_we_met" && typeof event.value === "number") {
      return sum + base * Math.max(0, Math.min(1, event.value / 2));
    }
    return sum + base;
  }, 0);

  const score = Math.max(-100, Math.min(100, Math.round(raw)));
  const metOffline = has(events, "offline_met");
  const gladWeMet = has(events, "glad_we_met");

  return {
    released: has(events, "introduction_released"),
    mutuallyAccepted: has(events, "mutual_accept"),
    conversationStarted: has(events, "conversation_started"),
    metOffline,
    gladWeMet,
    continuedContact: has(events, "continued_contact"),
    negative,
    score,
    meaningfulEncounter: !negative && metOffline && gladWeMet,
  };
}

/**
 * North-star denominator is introductions released, not sessions or messages.
 */
export function meaningfulEncounterRate(trajectories: EncounterTrajectory[]) {
  const released = trajectories.filter((item) => item.released);
  if (!released.length) return 0;
  return released.filter((item) => item.meaningfulEncounter).length / released.length;
}

export function learningLabel(trajectory: EncounterTrajectory) {
  if (trajectory.negative) return "strong_negative" as const;
  if (trajectory.meaningfulEncounter && trajectory.continuedContact) return "strong_positive" as const;
  if (trajectory.meaningfulEncounter) return "positive" as const;
  if (trajectory.mutuallyAccepted && !trajectory.metOffline) return "accepted_no_meeting" as const;
  if (trajectory.released && !trajectory.mutuallyAccepted) return "no_mutual_accept" as const;
  return "insufficient_outcome" as const;
}
