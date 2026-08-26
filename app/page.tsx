"use client";

import { useEffect, useMemo, useState, type KeyboardEvent } from "react";
import {
  buildInitialHumanModel,
  updateHumanModel,
  type HumanModel,
  type HumanSignal,
} from "../lib/human-model";

type Stage =
  | "landing"
  | "onboarding"
  | "reflection"
  | "boundaries"
  | "intention"
  | "home"
  | "profile";

const STORAGE_KEY = "bond.serendipity.human-model.v1";

const starterPrompts = [
  "What has been occupying your mind lately?",
  "What kind of person do you almost never meet, but wish you did?",
  "What are you already surrounded by that you do not need more of?",
];

const reflectionLabels = [
  "What pulls your attention",
  "What feels missing",
  "What you already have enough of",
];

function splitLines(value: string) {
  return value
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean);
}

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

export default function HomePage() {
  const [stage, setStage] = useState<Stage>("landing");
  const [messages, setMessages] = useState<string[]>([]);
  const [draft, setDraft] = useState("");
  const [promptIndex, setPromptIndex] = useState(0);
  const [model, setModel] = useState<HumanModel | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [editingReflection, setEditingReflection] = useState(false);
  const [reflectionDrafts, setReflectionDrafts] = useState<string[]>(["", "", ""]);
  const [wantText, setWantText] = useState("");
  const [notText, setNotText] = useState("");
  const [intentionText, setIntentionText] = useState("");

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as HumanModel;
        if (parsed.version === 1) {
          setModel(parsed);
          setMessages(parsed.onboarding ?? []);
          setWantText(parsed.wants.join("\n"));
          setNotText(parsed.notThis.join("\n"));
          setIntentionText(parsed.socialIntention);
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
    setModel(null);
    setEditingReflection(false);
    setReflectionDrafts(["", "", ""]);
    setWantText("");
    setNotText("");
    setIntentionText("");
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
    setReflectionDrafts(completedMessages);
    setWantText(initialModel.wants.join("\n"));
    setNotText(initialModel.notThis.join("\n"));
    setIntentionText("");
    setStage("reflection");
  }

  function handleComposerKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
      event.preventDefault();
      submitAnswer();
    }
  }

  function acceptReflection() {
    setEditingReflection(false);
    setStage("boundaries");
  }

  function rebuildReflection() {
    const cleaned = reflectionDrafts.map((item) => item.trim());
    if (cleaned.some((item) => !item)) return;
    const rebuilt = buildInitialHumanModel(cleaned);
    setMessages(cleaned);
    setModel(rebuilt);
    setWantText(rebuilt.wants.join("\n"));
    setNotText(rebuilt.notThis.join("\n"));
    setEditingReflection(false);
  }

  function saveBoundaries() {
    if (!model) return;
    const next = updateHumanModel(model, {
      wants: splitLines(wantText),
      notThis: splitLines(notText),
    });
    setModel(next);
    setStage("intention");
  }

  function activateSignal() {
    if (!model) return;
    const next = updateHumanModel(model, {
      wants: splitLines(wantText),
      notThis: splitLines(notText),
      socialIntention: intentionText.trim(),
    });
    setModel(next);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    setStage("home");
  }

  function saveProfileEdits() {
    if (!model) return;
    const next = updateHumanModel(model, {
      wants: splitLines(wantText),
      notThis: splitLines(notText),
      socialIntention: intentionText.trim(),
    });
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
    setEditingReflection(false);
    setReflectionDrafts(["", "", ""]);
    setWantText("");
    setNotText("");
    setIntentionText("");
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

      {!hydrated && (
        <section className="stage waiting">
          <p className="eyebrow">RESTORING YOUR PRIVATE SIGNAL</p>
        </section>
      )}

      {hydrated && stage === "landing" && (
        <section className="stage hero" aria-labelledby="hero-title">
          <div className="signalPill"><span className="signalDot" /> Athens pilot</div>
          <p className="eyebrow">QUIET TECHNOLOGY FOR HUMAN CONNECTION</p>
          <h1 id="hero-title">
            There are people in your city
            <span className="gradientText"> you should probably know.</span>
          </h1>
          <p className="lead">
            No people browser. No swipe deck. Bond learns enough to recognize an unusual
            human connection, then gets out of the way.
          </p>

          <div className="actions">
            <button className="primary" onClick={begin}>Start without a profile <span aria-hidden="true">→</span></button>
          </div>

          <div className="principles" aria-label="Bond principles">
            <span>Private by default</span>
            <span>Progressive reveal</span>
            <span>No swiping</span>
            <span>No popularity</span>
          </div>
        </section>
      )}

      {hydrated && stage === "onboarding" && (
        <section className="stage conversation" aria-labelledby="onboarding-title">
          <div className="conversationHeader">
            <div>
              <p className="eyebrow">THREE THINGS, THEN YOU ARE DONE</p>
              <h2 id="onboarding-title">No biography. Just tell me what actually matters.</h2>
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
                {promptIndex === starterPrompts.length - 1 ? "What did you hear?" : "Continue"}
                <span aria-hidden="true">→</span>
              </button>
            </div>
          </div>
        </section>
      )}

      {hydrated && stage === "reflection" && model && (
        <section className="stage lightStage" aria-labelledby="reflection-title">
          <p className="eyebrow">WHAT I THINK I HEARD</p>
          <h2 id="reflection-title">The shape is more important than a profile.</h2>
          <p className="lead modelLead">
            I am not diagnosing your personality. These are simply the three things you told me,
            kept visible so you can correct me before they affect an introduction.
          </p>

          {!editingReflection ? (
            <>
              <div className="reflectionStack">
                {messages.map((message, index) => (
                  <article className="reflectionRow" key={`${message}-${index}`}>
                    <span>{reflectionLabels[index]}</span>
                    <p>{message}</p>
                  </article>
                ))}
              </div>
              <div className="quietChoice">
                <button className="secondary inlineSecondary" type="button" onClick={() => setEditingReflection(true)}>Adjust something</button>
                <button className="primary" type="button" onClick={acceptReflection}>Yes, that is the shape <span aria-hidden="true">→</span></button>
              </div>
            </>
          ) : (
            <div className="reflectionEditor">
              {reflectionDrafts.map((value, index) => (
                <label key={reflectionLabels[index]}>
                  <span>{reflectionLabels[index]}</span>
                  <textarea
                    value={value}
                    rows={3}
                    onChange={(event) => {
                      const next = [...reflectionDrafts];
                      next[index] = event.target.value;
                      setReflectionDrafts(next);
                    }}
                  />
                </label>
              ))}
              <div className="quietChoice">
                <button className="secondary inlineSecondary" type="button" onClick={() => setEditingReflection(false)}>Cancel</button>
                <button className="primary" type="button" onClick={rebuildReflection}>Rebuild understanding</button>
              </div>
            </div>
          )}

          <p className="browserNote"><span /> Nothing here leaves this browser in the GitHub Pages prototype.</p>
        </section>
      )}

      {hydrated && stage === "boundaries" && model && (
        <section className="stage lightStage" aria-labelledby="boundaries-title">
          <p className="eyebrow">DESIRE + NEGATIVE SPACE</p>
          <h2 id="boundaries-title">Tell Bond what would enrich your world—and what would not.</h2>
          <p className="lead modelLead">One line is enough. Add more only if it genuinely matters.</p>

          <div className="dualPrompt">
            <label className="softPanel positivePanel">
              <span className="panelKicker">MORE OF THIS</span>
              <strong>What kind of person or world would feel new?</strong>
              <textarea
                value={wantText}
                onChange={(event) => setWantText(event.target.value)}
                placeholder="Someone outside medicine who thinks visually…"
                rows={5}
              />
            </label>

            <label className="softPanel negativePanel">
              <span className="panelKicker">NOT THIS</span>
              <strong>What should I actively avoid giving you more of?</strong>
              <textarea
                value={notText}
                onChange={(event) => setNotText(event.target.value)}
                placeholder="Professional networking. People matched only because we share a job…"
                rows={5}
              />
            </label>
          </div>

          <div className="quietChoice endChoice">
            <button className="secondary inlineSecondary" type="button" onClick={() => setStage("reflection")}>Back</button>
            <button className="primary" type="button" onClick={saveBoundaries}>Keep going <span aria-hidden="true">→</span></button>
          </div>
        </section>
      )}

      {hydrated && stage === "intention" && model && (
        <section className="stage intentionStage" aria-labelledby="intention-title">
          <div className="intentionHalo" aria-hidden="true" />
          <p className="eyebrow">ONE LAST THING</p>
          <h2 id="intention-title">Who would be interesting to meet <span className="gradientText">right now?</span></h2>
          <p className="lead narrow">Not a search query. A quiet standing intention. Bond can wait until the right person exists.</p>

          <div className="singleIntentComposer">
            <textarea
              value={intentionText}
              onChange={(event) => setIntentionText(event.target.value)}
              placeholder="Someone who challenges how I think without turning everything into a debate…"
              rows={5}
              autoFocus
            />
          </div>

          <div className="quietChoice centeredChoice">
            <button className="secondary inlineSecondary" type="button" onClick={() => setStage("boundaries")}>Back</button>
            <button className="primary" type="button" onClick={activateSignal}>Open my signal <span aria-hidden="true">→</span></button>
          </div>
        </section>
      )}

      {hydrated && stage === "home" && model && (
        <section className="stage waiting" aria-labelledby="waiting-title">
          <p className="eyebrow">ATHENS · SIGNAL OPEN</p>
          <div className="orbWrap" aria-hidden="true">
            <div className="orbPulse" />
            <div className="orb" />
          </div>
          <h1 id="waiting-title">I’m looking.</h1>
          <p className="lead narrow">
            There is nothing to browse. If I find a person worth interrupting you for,
            the introduction will arrive with a reason.
          </p>

          {model.socialIntention && (
            <button className="homeIntent intentButton" type="button" onClick={() => setStage("intention")}>
              <span>Current intention · tap to change</span>
              {model.socialIntention}
            </button>
          )}

          <div className="waitingCard">
            <div>
              <span className="cardLabel">Matching principle</span>
              <strong>Shared core + interesting divergence</strong>
            </div>
            <span className="searching"><i /> quiet search</span>
          </div>

          <button className="textLinkButton" type="button" onClick={() => setStage("profile")}>What Bond understands about me →</button>
          <p className="principle">Sometimes the right result is nothing yet.</p>
        </section>
      )}

      {hydrated && stage === "profile" && model && (
        <section className="stage modelStage" aria-labelledby="model-title">
          <div className="modelHeader compactModelHeader">
            <div className="modelHeaderCopy">
              <p className="eyebrow">WHAT BOND UNDERSTANDS ABOUT ME</p>
              <h2 id="model-title">The detailed model stays behind the experience.</h2>
              <p className="lead modelLead">This is inspectable because you should always be able to see what is influencing an introduction.</p>
            </div>
            <div className="modelPrivacy">Browser-local prototype</div>
          </div>

          <div className="modelGrid">
            <SignalCard title="Curiosity" signal={model.curiosity} />
            <SignalCard title="Desired exposure" signal={model.desiredExposure} />
            <SignalCard title="Conversation style" signal={model.conversationStyle} />
            <SignalCard title="Temperament" signal={model.temperament} />
          </div>

          <div className="profileEditGrid">
            <label className="profileEditPanel">
              <span>What I want</span>
              <textarea value={wantText} rows={4} onChange={(event) => setWantText(event.target.value)} />
            </label>
            <label className="profileEditPanel">
              <span>Not this</span>
              <textarea value={notText} rows={4} onChange={(event) => setNotText(event.target.value)} />
            </label>
          </div>

          <label className="profileEditPanel fullProfileEdit">
            <span>Current social intention</span>
            <textarea value={intentionText} rows={4} onChange={(event) => setIntentionText(event.target.value)} />
          </label>

          <div className="modelActions">
            <button className="textButton" type="button" onClick={resetEverything}>Erase my local model</button>
            <div className="modelActionsRight">
              <button className="secondary inlineSecondary" type="button" onClick={() => setStage("home")}>Cancel</button>
              <button className="primary" type="button" onClick={saveProfileEdits}>Save quietly</button>
            </div>
          </div>
        </section>
      )}

      <footer className="footer">Designed to reveal less at first—and become more human over time.</footer>
    </main>
  );
}
