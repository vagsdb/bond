"use client";

import { useEffect, useMemo, useState } from "react";
import type { HumanModel } from "../../lib/human-model";
import { rankPipeline, type FinalDecision, type PipelineEvaluation } from "../../lib/matching-pipeline";
import { sampleCandidates } from "../../lib/sample-candidates";
import "./lab.css";

const STORAGE_KEY = "bond.serendipity.human-model.v1";

function Metric({ label, value, penalty = false }: { label: string; value: number; penalty?: boolean }) {
  return (
    <div className={`labMetric ${penalty ? "penaltyMetric" : ""}`}>
      <div className="labMetricTop">
        <span>{label}</span>
        <strong>{value}</strong>
      </div>
      <div className="labMetricTrack" aria-hidden="true">
        <i style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

function DecisionBadge({ decision }: { decision: FinalDecision }) {
  return <span className={`decisionBadge ${decision}`}>{decision}</span>;
}

function CriticVerdict({ evaluation }: { evaluation: PipelineEvaluation }) {
  return (
    <span className={`criticVerdict ${evaluation.critic.verdict}`}>
      critic: {evaluation.critic.verdict}
    </span>
  );
}

export default function MatchingLabPage() {
  const [model, setModel] = useState<HumanModel | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

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

  const evaluations = useMemo(
    () => (model ? rankPipeline(model, sampleCandidates) : []),
    [model],
  );

  const selected = useMemo(() => {
    if (!evaluations.length) return null;
    return evaluations.find((item) => item.candidate.id === selectedId) ?? evaluations[0];
  }, [evaluations, selectedId]);

  useEffect(() => {
    if (evaluations.length && !selectedId) setSelectedId(evaluations[0].candidate.id);
  }, [evaluations, selectedId]);

  if (!hydrated) {
    return (
      <main className="labShell">
        <section className="labEmpty">Loading the local Bond model…</section>
      </main>
    );
  }

  if (!model) {
    return (
      <main className="labShell">
        <section className="labEmpty">
          <span className="labKicker">BOND MATCHING LAB · v1.1</span>
          <h1>No local human model yet.</h1>
          <p>Complete the main Bond onboarding first. The lab reads the same browser-local model and never creates a second profile.</p>
          <a className="labPrimary" href="../">Return to Bond</a>
        </section>
      </main>
    );
  }

  return (
    <main className="labShell">
      <header className="labHeader">
        <div>
          <span className="labKicker">BOND MATCHING LAB · v1.1 · INTERNAL</span>
          <h1>Propose it. <em>Attack it.</em> Then decide.</h1>
          <p>
            Synthetic test people only. The proposer makes the strongest evidence-grounded case for an encounter;
            an independent critic tries to break it; the final gate decides whether two people should actually be interrupted.
          </p>
        </div>
        <a className="labBack" href="../">← Bond</a>
      </header>

      <section className="pipelineLegend" aria-label="Bond decision architecture">
        <div><span>01</span><strong>Proposer</strong><small>construct the case</small></div>
        <i>→</i>
        <div><span>02</span><strong>Critic</strong><small>try to falsify it</small></div>
        <i>→</i>
        <div><span>03</span><strong>Threshold</strong><small>interrupt / wait / reject</small></div>
      </section>

      <section className="labSummary">
        <div>
          <span>Candidate set</span>
          <strong>{evaluations.length} synthetic people</strong>
        </div>
        <div>
          <span>Cleared final gate</span>
          <strong>{evaluations.filter((item) => item.finalDecision === "introduce").length}</strong>
        </div>
        <div>
          <span>Held for evidence</span>
          <strong>{evaluations.filter((item) => item.finalDecision === "hold").length}</strong>
        </div>
        <div>
          <span>Rejected</span>
          <strong>{evaluations.filter((item) => item.finalDecision === "reject").length}</strong>
        </div>
      </section>

      <section className="labWorkspace">
        <aside className="candidateRail" aria-label="Synthetic candidate ranking">
          <div className="railHeader">
            <span>Final ranking</span>
            <small>survival score</small>
          </div>
          {evaluations.map((evaluation, index) => (
            <button
              className={`candidateRow ${selected?.candidate.id === evaluation.candidate.id ? "active" : ""}`}
              key={evaluation.candidate.id}
              type="button"
              onClick={() => setSelectedId(evaluation.candidate.id)}
            >
              <span className="candidateRank">{String(index + 1).padStart(2, "0")}</span>
              <span className="candidateIdentity">
                <strong>{evaluation.candidate.firstName}</strong>
                <small>{evaluation.candidate.world}</small>
              </span>
              <DecisionBadge decision={evaluation.finalDecision} />
              <span className="totalScore">{evaluation.survivalScore}</span>
            </button>
          ))}
        </aside>

        {selected && (
          <article className="evaluationPanel">
            <div className="evaluationHero">
              <div>
                <span className="labKicker">SYNTHETIC CANDIDATE · {selected.candidate.city.toUpperCase()}</span>
                <h2>{selected.candidate.firstName}</h2>
                <p>{selected.candidate.world}</p>
              </div>
              <div className="heroDecision">
                <DecisionBadge decision={selected.finalDecision} />
                <strong>{selected.survivalScore}</strong>
                <span>survival score</span>
              </div>
            </div>

            <section className="decisionFlow">
              <div>
                <span>Proposer</span>
                <strong>{selected.proposal.breakdown.total}</strong>
                <small>{selected.proposal.decision} recommendation</small>
              </div>
              <i>→</i>
              <div>
                <span>Critic risk</span>
                <strong>{selected.critic.risk}</strong>
                <CriticVerdict evaluation={selected} />
              </div>
              <i>→</i>
              <div className="finalGateCard">
                <span>Final gate</span>
                <DecisionBadge decision={selected.finalDecision} />
                <small>only this state can reach users</small>
              </div>
            </section>

            <div className="metricGrid">
              <Metric label="Shared core" value={selected.proposal.breakdown.sharedCore} />
              <Metric label="Interesting divergence" value={selected.proposal.breakdown.interestingDivergence} />
              <Metric label="Reciprocity aggregate" value={selected.proposal.breakdown.reciprocity} />
              <Metric label="You → candidate" value={selected.proposal.breakdown.userToCandidate} />
              <Metric label="Candidate → you" value={selected.proposal.breakdown.candidateToUser} />
              <Metric label="Intention fit" value={selected.proposal.breakdown.intentionFit} />
              <Metric label="Boundary penalty" value={selected.proposal.breakdown.boundaryPenalty} penalty />
              <Metric label="Critic risk" value={selected.critic.risk} penalty />
            </div>

            <section className="proposerPanel">
              <span className="labKicker">01 · PROPOSER CASE</span>
              <blockquote>{selected.proposal.hypothesis}</blockquote>
              <div className="reasonList compactEvidence">
                {selected.proposal.reasons.length
                  ? selected.proposal.reasons.map((reason) => <span key={reason}>+ {reason}</span>)
                  : <span>No independently strong positive feature yet.</span>}
              </div>
            </section>

            <section className="criticPanel">
              <div className="criticHeader">
                <span className="labKicker">02 · ADVERSARIAL CRITIC</span>
                <CriticVerdict evaluation={selected} />
              </div>
              <p className="strongestObjection">{selected.critic.strongestObjection}</p>
              {selected.critic.findings.length ? (
                <div className="criticFindings">
                  {selected.critic.findings.map((finding) => (
                    <article className={`criticFinding ${finding.severity}`} key={`${finding.code}-${finding.label}`}>
                      <div>
                        <span>{finding.code.replaceAll("_", " ")}</span>
                        <strong>{finding.label}</strong>
                      </div>
                      <small>{finding.severity}</small>
                      <p>{finding.explanation}</p>
                    </article>
                  ))}
                </div>
              ) : (
                <p className="criticClear">No structural objection survived the critic checks.</p>
              )}
            </section>

            <section className="gatePanel">
              <div className="gateHeader">
                <span className="labKicker">03 · FINAL THRESHOLD</span>
                <DecisionBadge decision={selected.finalDecision} />
              </div>
              <div className="gateReasons">
                {selected.gateReasons.map((reason) => <span key={reason}>→ {reason}</span>)}
              </div>
            </section>

            {selected.connectionHypothesis ? (
              <section className="hypothesisPanel releaseHypothesis">
                <span className="labKicker">CONNECTION HYPOTHESIS · ELIGIBLE FOR PRIVACY REVIEW</span>
                <blockquote>{selected.connectionHypothesis}</blockquote>
              </section>
            ) : (
              <section className="withheldPanel">
                <span className="labKicker">CONNECTION HYPOTHESIS WITHHELD</span>
                <p>
                  Bond can construct a plausible story for many pairs. v1.1 does not allow that story to reach the user unless the pair clears the critic and final gate.
                </p>
              </section>
            )}

            <section className="candidateEvidence">
              <div>
                <span>They are curious about</span>
                <p>{selected.candidate.curiosity.join(" · ")}</p>
              </div>
              <div>
                <span>They want</span>
                <p>{selected.candidate.wants.join(" · ")}</p>
              </div>
              <div>
                <span>They explicitly do not want</span>
                <p>{selected.candidate.notThis.join(" · ")}</p>
              </div>
              <div>
                <span>Their current intention</span>
                <p>{selected.candidate.intention}</p>
              </div>
            </section>
          </article>
        )}
      </section>

      <footer className="labFooter">
        Bond Matching Engine v1.1 · proposer → critic → threshold. Debug scores are diagnostic only and never become public compatibility percentages.
      </footer>
    </main>
  );
}
