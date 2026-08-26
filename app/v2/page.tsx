"use client";

import { useEffect, useMemo, useState } from "react";
import type { HumanModel } from "../../lib/human-model";
import { evaluatePipeline } from "../../lib/matching-pipeline";
import { sampleCandidates } from "../../lib/sample-candidates";
import { reviewConnectionHypothesis } from "../../lib/v2/hypothesis";
import {
  createIntroduction,
  openConversation,
  recordDecision,
  visibleIntroductionFor,
} from "../../lib/v2/introduction";
import {
  createOutcomeEvent,
  summarizeTrajectory,
} from "../../lib/v2/outcomes";
import {
  candidateProfileToSemanticCandidate,
  retrieveCandidates,
} from "../../lib/v2/retrieval";
import { buildSemanticProfile } from "../../lib/v2/semantic-profile";
import type { IntroductionSnapshot, OutcomeEvent } from "../../lib/v2/contracts";
import "./v2.css";

const STORAGE_KEY = "bond.serendipity.human-model.v1";
const LOCAL_USER = "local-user";

export default function BondV2Lab() {
  const [model, setModel] = useState<HumanModel | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [introduction, setIntroduction] = useState<IntroductionSnapshot | null>(null);
  const [events, setEvents] = useState<OutcomeEvent[]>([]);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as HumanModel;
        if (parsed.version === 1) setModel(parsed);
      }
    } catch {
      setModel(null);
    } finally {
      setHydrated(true);
    }
  }, []);

  const semanticProfile = useMemo(
    () => model ? buildSemanticProfile(model, { city: "Athens", userId: LOCAL_USER, adultConfirmed: true }) : null,
    [model],
  );

  const semanticCandidates = useMemo(
    () => sampleCandidates.map((candidate) => candidateProfileToSemanticCandidate(candidate)),
    [],
  );

  const retrieved = useMemo(
    () => semanticProfile ? retrieveCandidates(semanticProfile, semanticCandidates, 8) : [],
    [semanticProfile, semanticCandidates],
  );

  useEffect(() => {
    if (!selectedId && retrieved.length) setSelectedId(retrieved[0].candidate.identity.userId);
  }, [retrieved, selectedId]);

  const candidate = useMemo(
    () => sampleCandidates.find((item) => item.id === selectedId) ?? null,
    [selectedId],
  );

  const pipeline = useMemo(
    () => model && candidate ? evaluatePipeline(model, candidate) : null,
    [model, candidate],
  );

  const privacyReview = useMemo(
    () => model && semanticProfile && pipeline
      ? reviewConnectionHypothesis({
          draft: pipeline.connectionHypothesis,
          model,
          semanticProfile,
          finalDecision: pipeline.finalDecision,
        })
      : null,
    [model, semanticProfile, pipeline],
  );

  const trajectory = useMemo(() => summarizeTrajectory(events), [events]);

  function chooseCandidate(id: string) {
    setSelectedId(id);
    setIntroduction(null);
    setEvents([]);
  }

  function releaseIntroduction() {
    if (!candidate || !privacyReview?.eligible || !privacyReview.hypothesis) return;
    const next = createIntroduction({
      id: `local-${candidate.id}`,
      userA: LOCAL_USER,
      userB: candidate.id,
      hypothesis: privacyReview.hypothesis,
    });
    setIntroduction(next);
    setEvents([
      createOutcomeEvent({ introductionId: next.id, userId: LOCAL_USER, type: "introduction_released" }),
    ]);
  }

  function decide(userId: string, decision: "accept" | "decline") {
    if (!introduction) return;
    const next = recordDecision(introduction, userId, decision);
    setIntroduction(next);
    if (next.status === "mutual_accept" && introduction.status !== "mutual_accept") {
      setEvents((current) => [
        ...current,
        createOutcomeEvent({ introductionId: next.id, userId: LOCAL_USER, type: "mutual_accept" }),
      ]);
    }
  }

  function startConversation() {
    if (!introduction) return;
    const next = openConversation(introduction);
    setIntroduction(next);
    setEvents((current) => [
      ...current,
      createOutcomeEvent({ introductionId: next.id, userId: LOCAL_USER, type: "conversation_started" }),
    ]);
  }

  function addOutcome(type: "offline_met" | "glad_we_met" | "continued_contact" | "not_worthwhile") {
    if (!introduction) return;
    if (events.some((event) => event.type === type)) return;
    setEvents((current) => [
      ...current,
      createOutcomeEvent({
        introductionId: introduction.id,
        userId: LOCAL_USER,
        type,
        value: type === "glad_we_met" ? 2 : true,
      }),
    ]);
  }

  if (!hydrated) {
    return <main className="v2Shell"><section className="v2Empty">Loading Bond v2 systems…</section></main>;
  }

  if (!model || !semanticProfile) {
    return (
      <main className="v2Shell">
        <section className="v2Empty">
          <span className="v2Kicker">BOND v2.0 · SYSTEMS LAB</span>
          <h1>First give Bond something real to understand.</h1>
          <p>Complete the normal Bond onboarding in this browser. v2 reads that same private local model rather than creating another profile.</p>
          <a href="../" className="v2Button">Return to Bond</a>
        </section>
      </main>
    );
  }

  const visible = introduction ? visibleIntroductionFor(introduction, LOCAL_USER) : null;
  const otherVisible = introduction && candidate
    ? visibleIntroductionFor(introduction, candidate.id)
    : null;

  return (
    <main className="v2Shell">
      <header className="v2Header">
        <div>
          <span className="v2Kicker">BOND v2.0 · SYSTEMS LAB</span>
          <h1>From understanding a person to <em>creating an encounter.</em></h1>
          <p>This route is a local diagnostic simulation. The production data model is now Supabase-ready, but no real user database or AI provider is connected here.</p>
        </div>
        <a href="../" className="v2Ghost">← Bond</a>
      </header>

      <section className="systemStrip">
        <div><span>Semantic model</span><strong>{semanticProfile.segments.length} dimensions/signals</strong></div>
        <div><span>Retrieved</span><strong>{retrieved.length} candidates</strong></div>
        <div><span>Decision</span><strong>{pipeline?.finalDecision ?? "—"}</strong></div>
        <div><span>Privacy gate</span><strong>{privacyReview?.eligible ? "clear" : "withheld"}</strong></div>
      </section>

      <section className="v2Grid">
        <aside className="retrievalRail">
          <div className="railTitle">
            <span>Semantic retrieval</span>
            <small>pre-proposer shortlist</small>
          </div>
          {retrieved.map((item, index) => (
            <button
              type="button"
              key={item.candidate.identity.userId}
              className={`retrievalRow ${selectedId === item.candidate.identity.userId ? "active" : ""}`}
              onClick={() => chooseCandidate(item.candidate.identity.userId)}
            >
              <span className="retrievalRank">{String(index + 1).padStart(2, "0")}</span>
              <span className="retrievalIdentity">
                <strong>{item.candidate.identity.firstName}</strong>
                <small>{item.candidate.identity.broadWorld}</small>
              </span>
              <span className="retrievalScore">{item.retrievalScore}</span>
            </button>
          ))}
        </aside>

        {candidate && pipeline && privacyReview && (
          <article className="v2Panel">
            <div className="candidateTop">
              <div>
                <span className="v2Kicker">SELECTED SYNTHETIC CANDIDATE</span>
                <h2>{candidate.firstName}</h2>
                <p>{candidate.world}</p>
              </div>
              <span className={`finalBadge ${pipeline.finalDecision}`}>{pipeline.finalDecision}</span>
            </div>

            <div className="decisionPipeline">
              <section>
                <span>01 · PROPOSER</span>
                <strong>{pipeline.proposal.breakdown.total}</strong>
                <p>Core {pipeline.proposal.breakdown.sharedCore} · divergence {pipeline.proposal.breakdown.interestingDivergence} · reciprocity {pipeline.proposal.breakdown.reciprocity}</p>
              </section>
              <section>
                <span>02 · CRITIC</span>
                <strong>{pipeline.critic.risk}</strong>
                <p>{pipeline.critic.verdict} · {pipeline.critic.findings.length} structural finding{pipeline.critic.findings.length === 1 ? "" : "s"}</p>
              </section>
              <section>
                <span>03 · THRESHOLD</span>
                <strong>{pipeline.survivalScore}</strong>
                <p>{pipeline.gateReasons[0] ?? "No release reason."}</p>
              </section>
            </div>

            <section className="privacyPanel">
              <div>
                <span className="v2Kicker">04 · HYPOTHESIS PRIVACY REVIEW</span>
                <h3>{privacyReview.eligible ? "Eligible to release" : "Withheld"}</h3>
              </div>
              {privacyReview.hypothesis ? (
                <blockquote>{privacyReview.hypothesis}</blockquote>
              ) : (
                <p>{privacyReview.reasons.join(" · ") || "No releaseable hypothesis."}</p>
              )}
            </section>

            {!introduction && (
              <section className="releasePanel">
                <div>
                  <span className="v2Kicker">05 · INTRODUCTION STATE MACHINE</span>
                  <h3>Can software now interrupt both people?</h3>
                  <p>Only an `introduce` decision plus a clear privacy review can instantiate an introduction.</p>
                </div>
                <button
                  type="button"
                  className="v2Button"
                  disabled={!privacyReview.eligible}
                  onClick={releaseIntroduction}
                >
                  Release simulated introduction →
                </button>
              </section>
            )}

            {introduction && (
              <section className="introSimulator">
                <div className="introStatusLine">
                  <div>
                    <span className="v2Kicker">LIVE STATE · {introduction.status.toUpperCase()}</span>
                    <h3>{introduction.status === "mutual_accept" || introduction.status === "conversation_open" ? "You both said yes." : "Waiting independently."}</h3>
                  </div>
                  <span>{introduction.revealLevel.replaceAll("_", " ")}</span>
                </div>

                <div className="decisionSides">
                  <section>
                    <span>You</span>
                    <strong>{introduction.userADecision}</strong>
                    {introduction.userADecision === "pending" && (
                      <div className="miniActions">
                        <button type="button" onClick={() => decide(LOCAL_USER, "accept")}>Meet them</button>
                        <button type="button" onClick={() => decide(LOCAL_USER, "decline")}>Not this one</button>
                      </div>
                    )}
                  </section>
                  <section>
                    <span>{candidate.firstName} · simulator control</span>
                    <strong>{introduction.userBDecision}</strong>
                    {introduction.userBDecision === "pending" && introduction.status === "pending" && (
                      <div className="miniActions">
                        <button type="button" onClick={() => decide(candidate.id, "accept")}>Simulate yes</button>
                        <button type="button" onClick={() => decide(candidate.id, "decline")}>Simulate no</button>
                      </div>
                    )}
                  </section>
                </div>

                <div className="projectionGrid">
                  <section>
                    <span>Your user-facing projection</span>
                    <strong>{visible ? `${visible.status} · ${visible.myDecision}` : "nothing visible"}</strong>
                  </section>
                  <section>
                    <span>Their user-facing projection</span>
                    <strong>{otherVisible ? `${otherVisible.status} · ${otherVisible.myDecision}` : "nothing visible"}</strong>
                  </section>
                </div>

                {(introduction.status === "mutual_accept" || introduction.status === "conversation_open") && (
                  <section className="mutualReveal">
                    <span className="v2Kicker">MUTUAL REVEAL</span>
                    <h3>{candidate.firstName} · {candidate.world}</h3>
                    <p>Minimal identity appears only after both decisions are yes. Photo and richer profile remain a later product decision.</p>
                    {introduction.status === "mutual_accept" && (
                      <button type="button" className="v2Button" onClick={startConversation}>Open pair conversation →</button>
                    )}
                  </section>
                )}

                {introduction.status === "conversation_open" && (
                  <section className="outcomePanel">
                    <span className="v2Kicker">06 · OUTCOME LEARNING</span>
                    <h3>Did this become a meaningful encounter?</h3>
                    <p className="openingPrompt">“Each choose one overlooked place in Athens you would show somebody who thinks they already know the city. Explain why only after you have both answered.”</p>
                    <div className="outcomeActions">
                      <button type="button" onClick={() => addOutcome("offline_met")}>We met offline</button>
                      <button type="button" onClick={() => addOutcome("glad_we_met")}>Glad we met</button>
                      <button type="button" onClick={() => addOutcome("continued_contact")}>Still in contact</button>
                      <button type="button" onClick={() => addOutcome("not_worthwhile")}>Not worthwhile</button>
                    </div>
                    <div className="trajectory">
                      <span>Meaningful encounter</span>
                      <strong>{trajectory.meaningfulEncounter ? "YES" : "not yet"}</strong>
                      <span>learning signal {trajectory.score}</span>
                    </div>
                  </section>
                )}
              </section>
            )}
          </article>
        )}
      </section>

      <footer className="v2Footer">
        v2 principle: retrieval narrows · AI may propose · AI may criticize · deterministic software controls release · outcomes teach the system what mattered.
      </footer>
    </main>
  );
}
