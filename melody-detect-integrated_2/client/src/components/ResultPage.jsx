// client/src/components/ResultPage.jsx
import React, { useEffect, useState } from "react";
import { API_BASE_URL } from "../config";

export default function ResultPage({ jobId, ircamJobId, cyaniteId, onReset }) {
  // ---- AI OR NOT ----
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  // ---- IRCAM AMPLIFY ----
  const [ircamResult, setIrcamResult] = useState(null);
  const [ircamError, setIrcamError] = useState("");
  const [ircamLoading, setIrcamLoading] = useState(true);

  // ---- CYANITE ----
  const [cyanite, setCyanite] = useState(null);
  const [cyaniteLoading, setCyaniteLoading] = useState(false);
  const [cyaniteError, setCyaniteError] = useState("");

  // Fetch AI OR NOT result
  useEffect(() => {
    let cancelled = false;
    async function fetchResult() {
      try {
        setLoading(true);
        setError("");
        const res = await fetch(`${API_BASE_URL}/api/results/${jobId}`);
        if (!res.ok) throw new Error("Failed to fetch results");
        const json = await res.json();
        if (!cancelled) setResult(json);
      } catch (e) {
        console.error(e);
        if (!cancelled) setError("Could not load results. Try again.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchResult();
    return () => {
      cancelled = true;
    };
  }, [jobId]);

  // Fetch IRCAM AMPLIFY result
  useEffect(() => {
    if (!ircamJobId) {
      setIrcamLoading(false);
      return;
    }
    let cancelled = false;
    async function fetchIrcamResult() {
      try {
        setIrcamLoading(true);
        setIrcamError("");
        const res = await fetch(`${API_BASE_URL}/api/ircam/results/${ircamJobId}`);
        if (!res.ok) throw new Error("Failed to fetch Ircam results");
        const json = await res.json();
        if (!cancelled) setIrcamResult(json);
      } catch (e) {
        console.error(e);
        if (!cancelled) setIrcamError("Could not load Ircam results. Try again.");
      } finally {
        if (!cancelled) setIrcamLoading(false);
      }
    }
    fetchIrcamResult();
    return () => {
      cancelled = true;
    };
  }, [ircamJobId]);

  // Fetch + POLL CYANITE result (mood from audioAnalysisV6)
  useEffect(() => {
    if (!cyaniteId) return;
    let cancelled = false;
    let attempts = 0;
    const MAX_ATTEMPTS = 20;   // ~1 minute if interval is 3s
    const INTERVAL_MS = 3000;  // 3 seconds

    async function pollOnce() {
      if (cancelled || attempts >= MAX_ATTEMPTS) return;
      attempts += 1;

      try {
        setCyaniteLoading(true);
        setCyaniteError("");

        const res = await fetch(
          `${API_BASE_URL}/api/cyanite/result/${cyaniteId}`
        );
        if (!res.ok) throw new Error("Failed to fetch Cyanite analysis");
        const json = await res.json();
        if (cancelled) return;

        setCyanite(json);

        const status = json?.audioAnalysisV6?.__typename;

        // Stop polling when we have a final state
        if (
          status === "AudioAnalysisV6Finished" ||
          status === "AudioAnalysisV6Failed"
        ) {
          setCyaniteLoading(false);
          return;
        }

        // Still processing / enqueued → schedule another poll
        setTimeout(pollOnce, INTERVAL_MS);
      } catch (e) {
        console.error(e);
        if (!cancelled) {
          setCyaniteError("Could not load musical analysis from Cyanite.");
          setCyaniteLoading(false);
        }
      }
    }

    // start first poll
    pollOnce();

    return () => {
      cancelled = true;
    };
  }, [cyaniteId]);


  // AI OR NOT loading
  if (loading) {
    return (
      <section className="result-page">
        <div className="result-card">
          <div className="loading-row">
            <div className="skeleton title-skel" />
            <div className="skeleton line-skel" />
            <div className="skeleton bar-skel" />
          </div>
          <div className="spacer" />
          <div className="actions center">
            <button className="btn" onClick={onReset}>
              Analyze another track
            </button>
          </div>
        </div>
      </section>
    );
  }

  // AI OR NOT error
  if (error) {
    return (
      <section className="result-page">
        <div className="result-card">
          <h2 className="h2">Authenticity Result</h2>
          <p className="error">{error}</p>
          <div className="actions">
            <button
              className="btn btn-primary"
              onClick={() => window.location.reload()}
            >
              Retry
            </button>
            <button className="btn" onClick={onReset}>
              Upload new file
            </button>
          </div>
        </div>
      </section>
    );
  }

  // AI OR NOT scores
  const aiProb = Number(result?.ai_probability ?? 0);
  const humanScorePct = Math.round((1 - aiProb) * 100);
  const aiScorePct = Math.round(aiProb * 100);

  // IRCAM AMPLIFY scores
  const ircamAiProb = Number(ircamResult?.ai_probability ?? 0);
  const ircamHumanScorePct = Math.round((1 - ircamAiProb) * 100);
  const ircamAiScorePct = Math.round(ircamAiProb * 100);

  // CYANITE mood derivation (AudioAnalysisV6)
  let cyaniteMoodTags = [];
  let cyaniteMoodAdvancedTags = [];
  let cyaniteStatus = cyanite?.audioAnalysisV6?.__typename;

  if (cyanite?.audioAnalysisV6?.__typename === "AudioAnalysisV6Finished") {
    cyaniteMoodTags = cyanite.audioAnalysisV6.result?.moodTags || [];
    cyaniteMoodAdvancedTags =
      cyanite.audioAnalysisV6.result?.moodAdvancedTags || [];
  }

  return (
    <section className="result-page">
      <div className="result-card">
        <h2 className="h2">Authenticity Results</h2>

        {/* AI OR NOT SECTION */}
        <div style={{ marginBottom: "2rem" }}>
          <h3 className="h3">AI or Not</h3>
          <div className="score-wrap">
            <span
              className="score-badge"
              aria-label={`Human likelihood ${humanScorePct} percent`}
            >
              {humanScorePct}% human-made
            </span>
          </div>

          <div
            className="meter"
            role="meter"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={humanScorePct}
            aria-label="Human probability"
          >
            <div className="meter-fill" style={{ width: `${humanScorePct}%` }} />
          </div>

          <div className="kpis">
            <div className="kpi">
              <div className="kpi-label">Human probability</div>
              <div className="kpi-value">{humanScorePct}%</div>
            </div>
            <div className="kpi">
              <div className="kpi-label">AI probability</div>
              <div className="kpi-value">{aiScorePct}%</div>
            </div>
          </div>

          <details className="details">
            <summary>See raw AI or Not response</summary>
            <pre className="pre">{JSON.stringify(result, null, 2)}</pre>
          </details>
        </div>

        {/* IRCAM AMPLIFY SECTION */}
        {ircamJobId && (
          <div style={{ marginBottom: "2rem", marginTop: "2rem", paddingTop: "2rem", borderTop: "1px solid #e0e0e0" }}>
            <h3 className="h3">Ircam Amplify</h3>

            {ircamLoading && (
              <p className="muted">Loading Ircam Amplify analysis…</p>
            )}

            {ircamError && (
              <p className="error small">{ircamError}</p>
            )}

            {ircamResult && !ircamLoading && (
              <>
                <div className="score-wrap">
                  <span
                    className="score-badge"
                    aria-label={`Human likelihood ${ircamHumanScorePct} percent`}
                  >
                    {ircamHumanScorePct}% human-made
                  </span>
                </div>

                <div
                  className="meter"
                  role="meter"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={ircamHumanScorePct}
                  aria-label="Human probability"
                >
                  <div className="meter-fill" style={{ width: `${ircamHumanScorePct}%` }} />
                </div>

                <div className="kpis">
                  <div className="kpi">
                    <div className="kpi-label">Human probability</div>
                    <div className="kpi-value">{ircamHumanScorePct}%</div>
                  </div>
                  <div className="kpi">
                    <div className="kpi-label">AI probability</div>
                    <div className="kpi-value">{ircamAiScorePct}%</div>
                  </div>
                </div>

                <details className="details">
                  <summary>See raw Ircam Amplify response</summary>
                  <pre className="pre">{JSON.stringify(ircamResult, null, 2)}</pre>
                </details>
              </>
            )}
          </div>
        )}

        {/* CYANITE SECTION */}
        {cyaniteId && (
          <div className="cyanite-section" style={{ marginTop: "2rem" }}>
            <h3 className="h3">Musical Mood (Cyanite AudioAnalysisV6)</h3>

            {cyaniteLoading && (
              <p className="muted">Loading Cyanite mood analysis…</p>
            )}

            {cyaniteError && (
              <p className="error small">{cyaniteError}</p>
            )}

            {cyanite && !cyaniteLoading && (
              <>
                <p className="muted">
                  Status: <strong>{cyaniteStatus || "Unknown"}</strong>
                </p>

                {cyaniteMoodTags.length > 0 && (
                  <div className="kpis">
                    <div className="kpi">
                      <div className="kpi-label">Primary mood</div>
                      <div className="kpi-value">
                        {cyaniteMoodTags.slice(0, 3).join(", ")}
                      </div>
                    </div>

                    {cyaniteMoodAdvancedTags.length > 0 && (
                      <div className="kpi">
                        <div className="kpi-label">Advanced mood</div>
                        <div className="kpi-value">
                          {cyaniteMoodAdvancedTags.slice(0, 3).join(", ")}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <details className="details">
                  <summary>See raw Cyanite response</summary>
                  <pre className="pre">
                    {JSON.stringify(cyanite, null, 2)}
                  </pre>
                </details>
              </>
            )}
          </div>
        )}

        <div className="actions center">
          <button className="btn" onClick={onReset}>
            Analyze another track
          </button>
        </div>
      </div>
    </section>
  );
}
