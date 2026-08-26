"use client";

import { useMemo, useState } from "react";

type Stage = "landing" | "onboarding" | "home";

const starterPrompts = [
  "What has been occupying your mind lately?",
  "What kind of person do you almost never meet, but wish you did?",
  "What are you already surrounded by that you do not need more of?",
];

export default function HomePage() {
  const [stage, setStage] = useState<Stage>("landing");
  const [messages, setMessages] = useState<string[]>([]);
  const [draft, setDraft] = useState("");
  const [promptIndex, setPromptIndex] = useState(0);

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

    setMessages((current) => [...current, value]);
    setDraft("");

    if (promptIndex < starterPrompts.length - 1) {
      setPromptIndex((current) => current + 1);
    } else {
      setStage("home");
    }
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
      event.preventDefault();
      submitAnswer();
    }
  }

  return (
    <main className="shell">
      <div className="ambient ambientOne" aria-hidden="true" />
      <div className="ambient ambientTwo" aria-hidden="true" />
      <div className="grain" aria-hidden="true" />

      <header className="topbar">
        <div className="brandMark" aria-label="Bond">
          <span className="brandDot" />
          BOND
        </div>
        <span className="version">SERENDIPITY v0.1</span>
      </header>

      {stage === "landing" && (
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

      {stage === "onboarding" && (
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
              onKeyDown={handleKeyDown}
              placeholder="Say it naturally…"
              rows={4}
              autoFocus
            />
            <div className="composerFooter">
              <span className="shortcut">⌘/Ctrl + Enter</span>
              <button className="primary compact" onClick={submitAnswer} disabled={!draft.trim()}>
                {promptIndex === starterPrompts.length - 1 ? "Let Bond start looking" : "Continue"}
                <span aria-hidden="true">→</span>
              </button>
            </div>
          </div>
        </section>
      )}

      {stage === "home" && (
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

          <div className="waitingCard">
            <div>
              <span className="cardLabel">Your signal is open</span>
              <strong>Shared core + interesting divergence</strong>
            </div>
            <span className="searching"><i /> searching</span>
          </div>

          <button className="secondary" onClick={begin}>Tell me something else about you</button>
          <p className="principle">Sometimes the right result is nothing yet.</p>
        </section>
      )}

      <footer className="footer">Designed to leave the screen—and become a real encounter.</footer>
    </main>
  );
}
