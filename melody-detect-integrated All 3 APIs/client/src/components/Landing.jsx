import React from "react";

export default function Landing({ onGetStarted }) {
  return (
    <section className="landing full-screen-bg">
      <div className="landing-bg full-screen-bg" />
      <header className="landing-header">
        <div className="brand">
          <span className="logo-dot" />
          <span className="brand-text">Melody Detect</span>
        </div>
      </header>

      <div className="landing-content">
        <h1 className="title">Melody Detect</h1>
        <p className="subtitle">
          Verify if a track is AI‑generated or human‑composed. Fast. Transparent. Reliable.
        </p>
        <button className="btn btn-primary btn-lg" onClick={onGetStarted}>
          Get started
        </button>
      </div>
    </section>
  );
}