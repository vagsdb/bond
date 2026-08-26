"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { HumanModel } from "../lib/human-model";
import {
  createPilotSecret,
  decidePilotIntroduction,
  getPilotIntroductions,
  getPilotMessages,
  getRevealedPilotProfile,
  openPilotConversation,
  registerPilot,
  runPilotMatch,
  savePilotModel,
  sendPilotMessage,
  type PilotIdentity,
  type PilotIntroduction,
  type PilotMessage,
  type RevealedPilotProfile,
} from "../lib/pilot-client";
import "./pilot.css";

const MODEL_KEY = "bond.serendipity.human-model.v1";
const IDENTITY_KEY = "bond.live-pilot.identity.v1";
const SYNC_KEY = "bond.live-pilot.synced-at.v1";

function readModel() {
  try {
    const raw = window.localStorage.getItem(MODEL_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as HumanModel;
    return parsed.version === 1 ? parsed : null;
  } catch {
    return null;
  }
}

function readIdentity() {
  try {
    const raw = window.localStorage.getItem(IDENTITY_KEY);
    return raw ? JSON.parse(raw) as PilotIdentity : null;
  } catch {
    return null;
  }
}

function shortTime(value: string) {
  try {
    return new Intl.DateTimeFormat(undefined, { hour: "2-digit", minute: "2-digit" }).format(new Date(value));
  } catch {
    return "";
  }
}

export default function PilotBridge() {
  const [model, setModel] = useState<HumanModel | null>(null);
  const [identity, setIdentity] = useState<PilotIdentity | null>(null);
  const [firstName, setFirstName] = useState("");
  const [adult, setAdult] = useState(false);
  const [joinOpen, setJoinOpen] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("Signal active.");
  const [error, setError] = useState("");
  const [introduction, setIntroduction] = useState<PilotIntroduction | null>(null);
  const [revealed, setRevealed] = useState<RevealedPilotProfile | null>(null);
  const [messages, setMessages] = useState<PilotMessage[]>([]);
  const [messageDraft, setMessageDraft] = useState("");

  useEffect(() => {
    setIdentity(readIdentity());
    setModel(readModel());

    const interval = window.setInterval(() => {
      const next = readModel();
      setModel((current) => {
        if (next?.updatedAt !== current?.updatedAt) return next;
        return current;
      });
    }, 1200);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    if (model && !identity) {
      const timer = window.setTimeout(() => setJoinOpen(true), 650);
      return () => window.clearTimeout(timer);
    }
  }, [model, identity]);

  const refresh = useCallback(async (currentIdentity = identity) => {
    if (!currentIdentity) return;
    try {
      const rows = await getPilotIntroductions(currentIdentity);
      const current = rows[0] ?? null;
      setIntroduction(current);

      if (!current) {
        setRevealed(null);
        setMessages([]);
        return;
      }

      if (current.mutual) {
        const profile = await getRevealedPilotProfile(currentIdentity, current.id);
        setRevealed(profile);
      } else {
        setRevealed(null);
      }

      if (current.visible_status === "conversation_open") {
        const nextMessages = await getPilotMessages(currentIdentity, current.id);
        setMessages(nextMessages);
      } else {
        setMessages([]);
      }
    } catch (problem) {
      const message = problem instanceof Error ? problem.message : "Could not refresh Bond.";
      if (message.includes("Pilot identity not recognized")) {
        window.localStorage.removeItem(IDENTITY_KEY);
        window.localStorage.removeItem(SYNC_KEY);
        setIdentity(null);
        setJoinOpen(true);
      } else {
        setError(message);
      }
    }
  }, [identity]);

  const syncAndLook = useCallback(async (currentIdentity: PilotIdentity, currentModel: HumanModel) => {
    setBusy(true);
    setError("");
    try {
      await savePilotModel(currentIdentity, currentModel);
      window.localStorage.setItem(SYNC_KEY, currentModel.updatedAt);
      const result = await runPilotMatch(currentIdentity);
      setStatus(result.matched ? "A connection appeared." : (result.reason ?? "Signal active."));
      await refresh(currentIdentity);
    } catch (problem) {
      setError(problem instanceof Error ? problem.message : "Bond could not sync your signal.");
    } finally {
      setBusy(false);
    }
  }, [refresh]);

  useEffect(() => {
    if (!identity || !model) return;
    const syncedAt = window.localStorage.getItem(SYNC_KEY);
    if (syncedAt !== model.updatedAt) {
      void syncAndLook(identity, model);
    } else {
      void refresh(identity);
    }
  }, [identity, model, refresh, syncAndLook]);

  useEffect(() => {
    if (!identity) return;
    const interval = window.setInterval(() => void refresh(identity), 15000);
    return () => window.clearInterval(interval);
  }, [identity, refresh]);

  useEffect(() => {
    if (introduction) setPanelOpen(true);
  }, [introduction?.id, introduction?.visible_status]);

  async function joinPilot() {
    if (!model || !firstName.trim() || !adult) return;
    setBusy(true);
    setError("");
    try {
      const secret = createPilotSecret();
      const participantId = await registerPilot(firstName.trim(), secret, "Athens");
      const nextIdentity: PilotIdentity = {
        participantId,
        secret,
        firstName: firstName.trim(),
        city: "Athens",
      };
      window.localStorage.setItem(IDENTITY_KEY, JSON.stringify(nextIdentity));
      setIdentity(nextIdentity);
      setJoinOpen(false);
      setStatus("Your signal is now in the Athens pilot.");
      await syncAndLook(nextIdentity, model);
    } catch (problem) {
      setError(problem instanceof Error ? problem.message : "Could not join the live pilot.");
    } finally {
      setBusy(false);
    }
  }

  async function checkNow() {
    if (!identity || !model) return;
    await syncAndLook(identity, model);
    setPanelOpen(true);
  }

  async function decide(decision: "accept" | "decline") {
    if (!identity || !introduction) return;
    setBusy(true);
    setError("");
    try {
      await decidePilotIntroduction(identity, introduction.id, decision);
      if (decision === "decline") {
        setPanelOpen(false);
        setIntroduction(null);
        setStatus("Signal active. That introduction is gone.");
      } else {
        setStatus("You said yes. Their choice stays private.");
        await refresh(identity);
      }
    } catch (problem) {
      setError(problem instanceof Error ? problem.message : "Could not record your choice.");
    } finally {
      setBusy(false);
    }
  }

  async function openConversation() {
    if (!identity || !introduction) return;
    setBusy(true);
    try {
      await openPilotConversation(identity, introduction.id);
      await refresh(identity);
    } catch (problem) {
      setError(problem instanceof Error ? problem.message : "Could not open the conversation.");
    } finally {
      setBusy(false);
    }
  }

  async function sendMessage() {
    if (!identity || !introduction || !messageDraft.trim()) return;
    const body = messageDraft.trim();
    setMessageDraft("");
    setBusy(true);
    try {
      await sendPilotMessage(identity, introduction.id, body);
      await refresh(identity);
    } catch (problem) {
      setMessageDraft(body);
      setError(problem instanceof Error ? problem.message : "Could not send the message.");
    } finally {
      setBusy(false);
    }
  }

  const openingPrompt = useMemo(
    () => messages.find((item) => item.opening_prompt)?.opening_prompt ?? null,
    [messages],
  );
  const actualMessages = messages.filter((item) => item.id && item.body);

  if (!model) return null;

  return (
    <>
      {joinOpen && !identity && (
        <div className="pilotOverlay" role="dialog" aria-modal="true" aria-label="Join the Bond live pilot">
          <section className="pilotCard joinCard">
            <button className="pilotClose" type="button" onClick={() => setJoinOpen(false)} aria-label="Not now">×</button>
            <span className="pilotKicker">ATHENS · LIVE PILOT</span>
            <h2>Make this signal real.</h2>
            <p className="pilotLead">
              Until now your Bond model lived only in this browser. Join the pilot and it can privately meet other real Bond signals.
            </p>
            <label className="pilotField">
              <span>First name</span>
              <input value={firstName} onChange={(event) => setFirstName(event.target.value)} placeholder="Your first name" maxLength={80} autoFocus />
            </label>
            <label className="pilotConsent">
              <input type="checkbox" checked={adult} onChange={(event) => setAdult(event.target.checked)} />
              <span>I am 18 or older and I want this Bond signal included in the Athens pilot.</span>
            </label>
            <button className="pilotPrimary" type="button" disabled={busy || !firstName.trim() || !adult} onClick={joinPilot}>
              {busy ? "Opening signal…" : "Join live pilot →"}
            </button>
            <p className="pilotPrivacy">This browser keeps the private key to your pilot identity. Your raw model is never publicly browsable.</p>
            {error && <p className="pilotError">{error}</p>}
          </section>
        </div>
      )}

      {identity && (
        <aside className={`pilotDock ${introduction ? "hasIntroduction" : ""}`}>
          <button type="button" className="pilotDockMain" onClick={() => setPanelOpen(true)}>
            <span><i /> LIVE PILOT</span>
            <strong>{introduction ? "A connection is waiting" : status}</strong>
          </button>
          {!introduction && (
            <button className="pilotCheck" type="button" disabled={busy} onClick={checkNow}>
              {busy ? "Looking…" : "Check"}
            </button>
          )}
        </aside>
      )}

      {identity && panelOpen && (
        <div className="pilotOverlay" role="dialog" aria-modal="true" aria-label="Bond live pilot">
          <section className={`pilotCard ${introduction?.visible_status === "conversation_open" ? "conversationCard" : ""}`}>
            <button className="pilotClose" type="button" onClick={() => setPanelOpen(false)} aria-label="Close">×</button>

            {!introduction && (
              <div className="pilotWaiting">
                <span className="pilotKicker">{identity.firstName.toUpperCase()} · SIGNAL ACTIVE</span>
                <div className="pilotOrb" aria-hidden="true" />
                <h2>Nothing yet.</h2>
                <p>{status}</p>
                <button className="pilotPrimary" type="button" disabled={busy} onClick={checkNow}>{busy ? "Looking…" : "Look now"}</button>
                <small>Bond does not create a match just to fill this screen.</small>
              </div>
            )}

            {introduction && introduction.visible_status === "pending" && (
              <div className="pilotIntro">
                <span className="pilotKicker">A RARE CONNECTION APPEARED</span>
                <h2>This one is unusual.</h2>
                <blockquote>{introduction.hypothesis}</blockquote>
                {introduction.my_decision === "pending" ? (
                  <div className="pilotChoices">
                    <button className="pilotSecondary" type="button" disabled={busy} onClick={() => decide("decline")}>Not this one</button>
                    <button className="pilotPrimary" type="button" disabled={busy} onClick={() => decide("accept")}>Meet them →</button>
                  </div>
                ) : (
                  <div className="pilotAccepted">
                    <span>✓ You said yes</span>
                    <p>Their choice stays private. If they also say yes, Bond will reveal the minimum needed to begin.</p>
                  </div>
                )}
              </div>
            )}

            {introduction?.mutual && introduction.visible_status === "mutual_accept" && revealed && (
              <div className="pilotReveal">
                <span className="pilotKicker">MUTUAL · MINIMAL REVEAL</span>
                <h2>You both said yes.</h2>
                <div className="revealedPerson">
                  <strong>{revealed.first_name}</strong>
                  <span>{revealed.city}</span>
                  {revealed.broad_world && <p>{revealed.broad_world}</p>}
                </div>
                <button className="pilotPrimary" type="button" disabled={busy} onClick={openConversation}>Open conversation →</button>
              </div>
            )}

            {introduction?.visible_status === "conversation_open" && revealed && (
              <div className="pilotConversation">
                <div className="pilotConversationHead">
                  <div><span className="pilotKicker">PRIVATE CONVERSATION</span><h2>{revealed.first_name}</h2></div>
                  <span className="conversationLive"><i /> open</span>
                </div>
                {openingPrompt && <blockquote className="openingPrompt">{openingPrompt}</blockquote>}
                <div className="pilotMessages" aria-live="polite">
                  {actualMessages.length === 0 && <p className="noMessages">The conversation is empty. That is allowed.</p>}
                  {actualMessages.map((message) => (
                    <div className={`pilotMessage ${message.mine ? "mine" : "theirs"}`} key={message.id!}>
                      <span>{message.mine ? "You" : message.sender_name} · {message.created_at ? shortTime(message.created_at) : ""}</span>
                      <p>{message.body}</p>
                    </div>
                  ))}
                </div>
                <div className="pilotComposer">
                  <textarea rows={3} value={messageDraft} onChange={(event) => setMessageDraft(event.target.value)} placeholder={`Write to ${revealed.first_name}…`} />
                  <button className="pilotPrimary" type="button" disabled={busy || !messageDraft.trim()} onClick={sendMessage}>Send</button>
                </div>
              </div>
            )}

            {error && <p className="pilotError">{error}</p>}
          </section>
        </div>
      )}
    </>
  );
}
