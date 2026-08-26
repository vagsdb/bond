"use client";

import { useState } from "react";

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

  return (
    <main className="shell">
      {stage === "landing" && (
        <section className="hero">
          <div className="eyebrow">BOND / SERENDIPITY v0.1</div>
          <h1>There are people in your city you should probably know.</h1>
          <p className="lead">
            Bond does not give you people to browse. It learns who might matter to you — then waits until there is a reason to introduce you.
          </p>
          <button className="primary" onClick={() => setStage("onboarding")}>Begin</button>
          <p className="quiet">No feed. No swiping. No popularity. No manufactured urgency.</p>
        </section>
      )}

      {stage === "onboarding" && (
        <section className="conversation">
          <div className="eyebrow">GETTING TO KNOW YOU</div>
          <h2>I would rather understand you than make you fill out a profile.</h2>

          <div className="thread">
            {messages.map((message, index) => (
              <div className="exchange" key={`${message}-${index}`}>
                <div className="bondMessage">{starterPrompts[index]}</div>
                <div className="userMessage">{message}</div>
              </div>
            ))}
            <div className="bondMessage current">{starterPrompts[promptIndex]}</div>
          </div>

          <div className="composer">
            <textarea
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="Say it naturally…"
              rows={4}
            />
            <button className="primary" onClick={submitAnswer}>
              {promptIndex === starterPrompts.length - 1 ? "Let Bond start looking" : "Continue"}
            </button>
          </div>
        </section>
      )}

      {stage === "home" && (
        <section className="waiting">
          <div className="eyebrow">ATHENS</div>
          <div className="orb" aria-hidden="true" />
          <h1>I’m looking.</h1>
          <p className="lead narrow">
            You do not need to search. If I find someone worth interrupting you for, I’ll tell you.
          </p>
          <button className="secondary" onClick={() => setStage("onboarding")}>Tell me something else about you</button>
          <div className="principle">Sometimes the right result is nothing yet.</div>
        </section>
      )}
    </main>
  );
}
