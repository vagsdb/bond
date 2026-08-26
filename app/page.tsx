"use client";

import { useEffect, useMemo, useState, type KeyboardEvent } from "react";
import {
  buildInitialHumanModel,
  updateHumanModel,
  type HumanModel,
  type HumanSignal,
} from "../lib/human-model";

type Stage = "landing" | "onboarding" | "profile" | "home";

const STORAGE_KEY = "bond.serendipity.human-model.v1";

const starterPrompts = [
  "What has been occupying your mind lately?",
  "What kind of person do you almost never meet, but wish you did?",
  "What are you already surrounded by that you do not need more of?",
];

function SignalCard({ title, signal }: { title: string; signal: HumanSignal }) {
  return (
    <article className="signalCard">
      <div className="signalTop">
        <span className="signalLabel">{title}</span>
        <span className="confidence">{signal.confidence}</span>
      </div>
      <h3>{signal.label}</h3>
      <p className="signalEvidence">{signal.evidence}</p>
    </article>
  );
}

function TagEditor({
  label,
  hint,
  values,
  placeholder,
  onChange,
}: {
  label: string;
  hint: string;
  values: string[];
  placeholder: string;
  onChange: (values: string[]) => void;
}) {
  const [draft, setDraft] = useState("");

  function add() {
    const value = draft.trim();
    if (!value || values.some((item) => item.toLowerCase() === value.toLowerCase())) return;
    onChange([...values, value]);
    setDraft("");
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") {
      event.preventDefault();
      add();
    }
  }

  return (
    <article className="editorCard">
      <div className="editorTop">
        <span className="editorLabel">{label}</span>
      </div>
      <p className="editorHint">{hint}</p>

      {values.length > 0 && (
        <div className="tagList">
          {values.map((value) => (
            <span className="tag" key={value}>
              <span>{value}</span>
              <button
                type="button"
                aria-label={`Remove ${value}`}
                onClick={() => onChange(values.filter((item) => item !== value))}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}

      <div className="tagComposer">
        <input
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
        />
        <button type="button" aria-label={`Add to ${label}`} onClick={add}>+</button>
      </div>
    </article>
  );
}

export default function HomePage() {
  const [stage, setStage] = useState<Stage>("landing");
  const [messages, setMessages] = useState<string[]>([]);
  const [draft, setDraft] = useState("");
  const [promptIndex, setPromptIndex] = useState(0);
  const [model, setModel] = useState<HumanModel | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as HumanModel;
        if (parsed.version === 1) {
          setModel(parsed);
          setStage("home");
        }
      }
    } catch {
      window.localStorage.removeItem(STORAGE_KEY);
    } finally {
      setHydrated(true);
    }
  }, []);

  const progress = useMemo(
    () => Math.round(((promptIndex + 1) / starterPrompts.length) * 100),
    [promptIndex],
  );

  function begin() {
    setMessages([]);
    setDraft("");
    setPromptIndex(0);
    setStage("onboarding");
  }

  function submitAnswer() {
    const value = draft.trim();
    if (!value) return;

    const completedMessages = [...messages, value];
    setMessages(completedMessages);
    setDraft("");

    if (promptIndex < starterPrompts.length - 1) {
      setPromptIndex((current) => current + 1);
      return;
    }

    const initialModel = buildInitialHumanModel(completedMessages);
    setModel(initialModel);
    setStage("profile");
  }

  function handleComposerKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
      event.preventDefault();
      submitAnswer();
    }
  }

  function patchModel(patch: Partial<HumanModel>) {
    setModel((current) => (current ? updateHumanModel(current, patch) : current));
  }

  function saveAndLook() {
    if (!model) return;
    const next = updateHumanModel(model, {});
    setModel(next);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    setStage("home");
  }

  function resetEverything() {
    window.localStorage.removeItem(STORAGE_KEY);
    setModel(null);
    setMessages([]);
    setDraft("");
    setPromptIndex(0);
    setStage("landing");
  }

  return (
    <main className="shell">
      <div className="ambient ambientOne" aria-hidden="true" />
      <div className="ambient ambientTwo" aria-hidden="true" />
      <div className="grain" aria-hidden="true" />

      <header className="topbar">
        <button
          type="button"
          className="brandMark brandButton"
          aria-label="Bond home"
          onClick={() => setStage(model ? "home" : "landing")}
        >
          <span className="brandDot" />
          BOND
        </button>
        <span className="version">SERENDIPITY v0.1</span>
      </header>

      {!hydrated && <section className="stage waiting"><p className="eyebrow">RESTORING YOUR PRIVATE MODEL</p></section>}

      {hydrated && stage === "landing" && (
        <section className="stage hero" aria-labelledby="hero-title">
          <div className="signalPill"><span className="signalDot" /> Athens pilot</div>
          <p className="eyebrow">QUIET TECHNOLOGY FOR HUMAN CONNECTION</p>
          <h1 id="hero-title">
            There are people in your city
            <span className="gradientText"> you should probably know.</span>
          </h1>
          <p className="lead">
            Bond does not give you people to browse. It learns who might matter to you,
            then waits until there is a genuine reason to introduce you.
          </p>

          <div className="actions">
            <button className="primary" onClick={begin}>Begin quietly <span aria-hidden="true">→</span></button>
          </div>

          <div className="principles" aria-label="Bond principles">
            <span>No feed</span>
            <span>No swiping</span>
            <span>No popularity</span>
            <span>No manufactured urgency</span>
          </div>
        </section>
      )}

      {hydrated && stage === "onboarding" && (
        <section className="stage conversation" aria-labelledby="onboarding-title">
          <div className="conversationHeader">
            <div>
              <p className="eyebrow">GETTING TO KNOW YOU</p>
              <h2 id="onboarding-title">I would rather understand you than make you fill out a profile.</h2>
            </div>
            <div className="progressWrap" aria-label={`${progress}% complete`}>
              <span>{promptIndex + 1}/{starterPrompts.length}</span>
              <div className="progressTrack"><div className="progressBar" style={{ width: `${progress}%` }} /></div>
            </div>
          </div>

          <div className="thread" aria-live="polite">
            {messages.map((message, index) => (
              <div className="exchange" key={`${message}-${index}`}>
                <div className="bondMessage">
                  <span className="messageLabel">Bond</span>
                  {starterPrompts[index]}
                </div>
                <div className="userMessage">
                  <span className="messageLabel">You</span>
                  {message}
                </div>
              </div>
            ))}
            <div className="bondMessage current">
              <span className="messageLabel">Bond</span>
              {starterPrompts[promptIndex]}
            </div>
          </div>

          <div className="composer">
            <textarea
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={handleComposerKeyDown}
              placeholder="Say it naturally…"
              rows={4}
              autoFocus
            />
            <div className="composerFooter">
              <span className="shortcut">⌘/Ctrl + Enter</span>
              <button className="primary compact" onClick={submitAnswer} disabled={!draft.trim()}>
                {promptIndex === starterPrompts.length - 1 ? "Show me what you understood" : "Continue"}
                <span aria-hidden="true">→</span>
              </button>
            </div>
          </div>
        </section>
      )}

      {hydrated && stage === "profile" && model && (
        <section className="stage modelStage" aria-labelledby="model-title">
          <div className="modelHeader">
            <div className="modelHeaderCopy">
              <p className="eyebrow">YOUR PRIVATE HUMAN MODEL</p>
              <h2 id="model-title">Here is what Bond currently understands about you.</h2>
              <p className="lead modelLead">
                Direct evidence stays direct. Tentative interpretations are marked as tentative.
                Correct the model whenever it gets you wrong.
              </p>
            </div>
            <div className="modelPrivacy">Stored only in this browser</div>
          </div>

          <div className="modelGrid">
            <SignalCard title="Curiosity" signal={model.curiosity} />
            <SignalCard title="Desired exposure" signal={model.desiredExposure} />
            <SignalCard title="Conversation style" signal={model.conversationStyle} />
            <SignalCard title="Temperament" signal={model.temperament} />
          </div>

          <div className="modelEditors">
            <TagEditor
              label="What I want"
              hint="People, energies, perspectives or worlds you want more access to."
              values={model.wants}
              placeholder="e.g. someone outside my field"
              onChange={(wants) => patchModel({ wants })}
            />
            <TagEditor
              label="Not this"
              hint="As important as desire: what should Bond actively avoid giving you more of?"
              values={model.notThis}
              placeholder="e.g. professional networking"
              onChange={(notThis) => patchModel({ notThis })}
            />
          </div>

          <article className="intentionCard">
            <div className="intentionTop">
              <div>
                <span className="editorLabel">Social intention</span>
                <p className="intentionHint">Not a search query. A standing intention Bond can keep in mind until the right person exists.</p>
              </div>
            </div>
            <textarea
              className="intentionInput"
              value={model.socialIntention}
              onChange={(event) => patchModel({ socialIntention: event.target.value })}
              placeholder="I would like to meet someone who…"
              rows={4}
            />
          </article>

          <div className="modelActions">
            <button className="textButton" type="button" onClick={resetEverything}>Erase this model and start over</button>
            <div className="modelActionsRight">
              <button className="secondary" type="button" onClick={begin}>Talk to Bond again</button>
              <button className="primary" type="button" onClick={saveAndLook}>This feels right <span aria-hidden="true">→</span></button>
            </div>
          </div>
        </section>
      )}

      {hydrated && stage === "home" && model && (
        <section className="stage waiting" aria-labelledby="waiting-title">
          <p className="eyebrow">ATHENS · ACTIVE</p>
          <div className="orbWrap" aria-hidden="true">
            <div className="orbPulse" />
            <div className="orb" />
          </div>
          <h1 id="waiting-title">I’m looking.</h1>
          <p className="lead narrow">
            You do not need to search. If I find someone worth interrupting you for,
            I’ll tell you.
          </p>

          {model.socialIntention && (
            <div className="homeIntent">
              <span>Current intention</span>
              {model.socialIntention}
            </div>
          )}

          <div className="waitingCard">
            <div>
              <span className="cardLabel">Your signal is open</span>
              <strong>Shared core + interesting divergence</strong>
            </div>
            <span className="searching"><i /> searching</span>
          </div>

          <button className="secondary" onClick={() => setStage("profile")}>Review what Bond understands</button>
          <p className="principle">Sometimes the right result is nothing yet.</p>
        </section>
      )}

      <footer className="footer">Designed to leave the screen—and become a real encounter.</footer>
    </main>
  );
}
