import React, { useEffect, useState } from "react";

export default function ResultPage({ jobId, onReset }) {
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function fetchResult() {
      try {
        setLoading(true);
        setError("");
        const res = await fetch(`http://localhost:5000/api/results/${jobId}`);
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

  const aiProb = Number(result?.ai_probability ?? 0);
  const humanScorePct = Math.round((1 - aiProb) * 100);
  const aiScorePct = Math.round(aiProb * 100);

  return (
    <section className="result-page">
      <div className="result-card">
        <h2 className="h2">Authenticity Result</h2>

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
          {result?.model && (
            <div className="kpi">
              <div className="kpi-label">Model</div>
              <div className="kpi-value mono">{result.model}</div>
            </div>
          )}
          {result?.version && (
            <div className="kpi">
              <div className="kpi-label">Version</div>
              <div className="kpi-value mono">{result.version}</div>
            </div>
          )}
          {result?.timestamp && (
            <div className="kpi">
              <div className="kpi-label">Analyzed at</div>
              <div className="kpi-value mono">
                {new Date(result.timestamp).toLocaleString()}
              </div>
            </div>
          )}
        </div>

        <details className="details">
          <summary>See raw response</summary>
          <pre className="pre">{JSON.stringify(result, null, 2)}</pre>
        </details>

        <div className="actions center">
          <button className="btn" onClick={onReset}>
            Analyze another track
          </button>
        </div>
      </div>
    </section>
  );
}
