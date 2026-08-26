"use client";

import { useEffect, useMemo, useState } from "react";
import type { HumanModel } from "../../lib/human-model";
import { rankCandidates, type MatchEvaluation } from "../../lib/matching";
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

function DecisionBadge({ decision }: { decision: MatchEvaluation["decision"] }) {
  return <span className={`decisionBadge ${decision}`}>{decision}</span>;
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
    () => (model ? rankCandidates(model, sampleCandidates) : []),
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
          <span className="labKicker">BOND MATCHING LAB · INTERNAL PROTOTYPE</span>
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
          <span className="labKicker">BOND MATCHING LAB · v0.1</span>
          <h1>Who should Bond <em>not</em> introduce you to?</h1>
          <p>
            Synthetic test people only. Numbers are visible here because this is a diagnostic surface;
            they never belong in the user-facing Bond experience.
          </p>
        </div>
        <a className="labBack" href="../">← Bond</a>
      </header>

      <section className="labSummary">
        <div>
          <span>Candidate set</span>
          <strong>{evaluations.length} synthetic people</strong>
        </div>
        <div>
          <span>Ready to introduce</span>
          <strong>{evaluations.filter((item) => item.decision === "introduce").length}</strong>
        </div>
        <div>
          <span>Held for more evidence</span>
          <strong>{evaluations.filter((item) => item.decision === "hold").length}</strong>
        </div>
        <div>
          <span>Rejected</span>
          <strong>{evaluations.filter((item) => item.decision === "reject").length}</strong>
        </div>
      </section>

      <section className="labWorkspace">
        <aside className="candidateRail" aria-label="Synthetic candidate ranking">
          <div className="railHeader">
            <span>Ranked candidates</span>
            <small>debug score</small>
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
              <DecisionBadge decision={evaluation.decision} />
              <span className="totalScore">{evaluation.breakdown.total}</span>
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
                <DecisionBadge decision={selected.decision} />
                <strong>{selected.breakdown.total}</strong>
                <span>internal total</span>
              </div>
            </div>

            <div className="metricGrid">
              <Metric label="Shared core" value={selected.breakdown.sharedCore} />
              <Metric label="Interesting divergence" value={selected.breakdown.interestingDivergence} />
              <Metric label="Reciprocity" value={selected.breakdown.reciprocity} />
              <Metric label="Intention fit" value={selected.breakdown.intentionFit} />
              <Metric label="Boundary penalty" value={selected.breakdown.boundaryPenalty} penalty />
            </div>

            <section className="hypothesisPanel">
              <span className="labKicker">CONNECTION HYPOTHESIS · DEBUG DRAFT</span>
              <blockquote>{selected.hypothesis}</blockquote>
            </section>

            <div className="evidenceColumns">
              <section>
                <span className="columnTitle">Why this survived</span>
                {selected.reasons.length ? (
                  <div className="reasonList">
                    {selected.reasons.map((reason) => <span key={reason}>+ {reason}</span>)}
                  </div>
                ) : (
                  <p className="emptyEvidence">No strong positive signal yet.</p>
                )}
              </section>
              <section>
                <span className="columnTitle">What argues against it</span>
                {selected.cautions.length ? (
                  <div className="cautionList">
                    {selected.cautions.map((caution) => <span key={caution}>− {caution}</span>)}
                  </div>
                ) : (
                  <p className="emptyEvidence">No major structural caution detected.</p>
                )}
              </section>
            </div>

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
        v0.1 is deliberately deterministic. The lab exists to make bad matching logic visible before an AI layer is allowed to make it persuasive.
      </footer>
    </main>
  );
}
