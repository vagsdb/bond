import type { HumanModel } from "./human-model";
import { buildSemanticProfile } from "./v2/semantic-profile";

export const BOND_SUPABASE_URL = "https://zxrwieiarlokxynuyhyh.supabase.co";
export const BOND_SUPABASE_PUBLISHABLE_KEY = "sb_publishable_1Jic2sZ5nlC7zSYVkmYubA_VBLVIflb";

export type PilotIdentity = {
  participantId: string;
  secret: string;
  firstName: string;
  city: string;
};

export type PilotIntroduction = {
  id: string;
  visible_status: "pending" | "mutual_accept" | "conversation_open";
  hypothesis: string;
  expires_at: string;
  my_decision: "pending" | "accept";
  mutual: boolean;
  other_participant_id: string | null;
  reveal_level: "hypothesis_only" | "minimal_identity" | "full_conversation";
  conversation_id: string | null;
};

export type RevealedPilotProfile = {
  participant_id: string;
  first_name: string;
  city: string;
  broad_world: string | null;
};

export type PilotMessage = {
  id: string | null;
  mine: boolean | null;
  sender_name: string | null;
  body: string | null;
  created_at: string | null;
  opening_prompt: string;
};

async function rpc<T>(name: string, body: Record<string, unknown>): Promise<T> {
  const response = await fetch(`${BOND_SUPABASE_URL}/rest/v1/rpc/${name}`, {
    method: "POST",
    headers: {
      apikey: BOND_SUPABASE_PUBLISHABLE_KEY,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const problem = await response.json().catch(() => null) as { message?: string } | null;
    throw new Error(problem?.message ?? `Bond pilot request failed (${response.status}).`);
  }

  const text = await response.text();
  return (text ? JSON.parse(text) : null) as T;
}

export function createPilotSecret() {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (value) => value.toString(16).padStart(2, "0")).join("");
}

export async function registerPilot(firstName: string, secret: string, city = "Athens") {
  const participantId = await rpc<string>("bond_pilot_register", {
    p_first_name: firstName,
    p_city: city,
    p_secret: secret,
    p_adult_confirmed: true,
  });
  return participantId;
}

export async function savePilotModel(identity: PilotIdentity, model: HumanModel) {
  const semantic = buildSemanticProfile(model, {
    userId: identity.participantId,
    city: identity.city,
    adultConfirmed: true,
  });

  await rpc<null>("bond_pilot_save_model", {
    p_participant_id: identity.participantId,
    p_secret: identity.secret,
    p_model: model,
    p_semantic: semantic,
    p_broad_world: model.curiosity.label,
  });
}

export async function runPilotMatch(identity: PilotIdentity) {
  const response = await fetch(`${BOND_SUPABASE_URL}/functions/v1/bond-match`, {
    method: "POST",
    headers: {
      apikey: BOND_SUPABASE_PUBLISHABLE_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      participantId: identity.participantId,
      secret: identity.secret,
    }),
  });

  const result = await response.json().catch(() => ({})) as { matched?: boolean; reason?: string; error?: string };
  if (!response.ok) throw new Error(result.error ?? "Bond could not check your signal.");
  return result;
}

export function getPilotIntroductions(identity: PilotIdentity) {
  return rpc<PilotIntroduction[]>("bond_pilot_visible_introductions", {
    p_participant_id: identity.participantId,
    p_secret: identity.secret,
  });
}

export async function decidePilotIntroduction(
  identity: PilotIdentity,
  introductionId: string,
  decision: "accept" | "decline",
) {
  await rpc<null>("bond_pilot_record_decision", {
    p_participant_id: identity.participantId,
    p_secret: identity.secret,
    p_introduction_id: introductionId,
    p_decision: decision,
  });
}

export async function getRevealedPilotProfile(identity: PilotIdentity, introductionId: string) {
  const rows = await rpc<RevealedPilotProfile[]>("bond_pilot_revealed_profile", {
    p_participant_id: identity.participantId,
    p_secret: identity.secret,
    p_introduction_id: introductionId,
  });
  return rows[0] ?? null;
}

export async function openPilotConversation(identity: PilotIdentity, introductionId: string) {
  return rpc<string>("bond_pilot_open_conversation", {
    p_participant_id: identity.participantId,
    p_secret: identity.secret,
    p_introduction_id: introductionId,
  });
}

export function getPilotMessages(identity: PilotIdentity, introductionId: string) {
  return rpc<PilotMessage[]>("bond_pilot_messages", {
    p_participant_id: identity.participantId,
    p_secret: identity.secret,
    p_introduction_id: introductionId,
  });
}

export async function sendPilotMessage(identity: PilotIdentity, introductionId: string, body: string) {
  return rpc<string>("bond_pilot_send_message", {
    p_participant_id: identity.participantId,
    p_secret: identity.secret,
    p_introduction_id: introductionId,
    p_body: body,
  });
}
