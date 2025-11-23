import React, { useEffect, useState } from "react";

export default function ResultPage({ jobId, cyaniteId, ircamJobId, onReset }) {
  // AI OR NOT
  const [aiResult, setAiResult] = useState(null);
  const [aiError, setAiError] = useState("");
  const [aiLoading, setAiLoading] = useState(true);

  // CYANITE
  const [cyanite, setCyanite] = useState(null);
  const [cyaniteLoading, setCyaniteLoading] = useState(false);
  const [cyaniteError, setCyaniteError] = useState("");

  // IRCAM
  const [ircamResult, setIrcamResult] = useState(null);
  const [ircamLoading, setIrcamLoading] = useState(false);
  const [ircamError, setIrcamError] = useState("");

  // Fetch AI OR NOT result
  useEffect(() => {
    let cancelled = false;
    async function fetchResult() {
      try {
        setAiLoading(true);
        setAiError("");
        const res = await fetch(`http://localhost:5000/api/results/${jobId}`);
        if (!res.ok) throw new Error("Failed to fetch AI or Not results");
        const json = await res.json();
        if (!cancelled) setAiResult(json);
      } catch (e) {
        console.error(e);
        if (!cancelled) setAiError("Could not load AI or Not results.");
      } finally {
        if (!cancelled) setAiLoading(false);
      }
    }
    if (jobId) fetchResult();
    return () => {
      cancelled = true;
    };
  }, [jobId]);

  // Poll CYANITE
  useEffect(() => {
    if (!cyaniteId) return;
    let cancelled = false;
    let attempts = 0;
    const MAX_ATTEMPTS = 20;
    const INTERVAL_MS = 3000;

    async function pollOnce() {
      if (cancelled || attempts >= MAX_ATTEMPTS) return;
      attempts += 1;

      try {
        setCyaniteLoading(true);
        setCyaniteError("");

        const res = await fetch(
          `http://localhost:5000/api/cyanite/result/${cyaniteId}`
        );
        if (!res.ok) throw new Error("Failed to fetch Cyanite analysis");
        const json = await res.json();
        if (cancelled) return;

        setCyanite(json);

        const analysis = json?.audioAnalysisV6 || json?.audioAnalysisV7;
        const status = analysis?.__typename;

        if (
          status === "AudioAnalysisV6Finished" ||
          status === "AudioAnalysisV7Finished" ||
          status === "AudioAnalysisV6Failed" ||
          status === "AudioAnalysisV7Failed"
        ) {
          setCyaniteLoading(false);
          return;
        }

        setTimeout(pollOnce, INTERVAL_MS);
      } catch (e) {
        console.error(e);
        if (!cancelled) {
          setCyaniteError(
            "Could not load musical analysis from Cyanite."
          );
          setCyaniteLoading(false);
        }
      }
    }

    pollOnce();
    return () => {
      cancelled = true;
    };
  }, [cyaniteId]);

  // Poll IRCAM
  useEffect(() => {
    if (!ircamJobId) return;
    let cancelled = false;
    let attempts = 0;
    const MAX_ATTEMPTS = 30;
    const INTERVAL_MS = 3000;

    async function pollOnce() {
      if (cancelled || attempts >= MAX_ATTEMPTS) return;
      attempts += 1;

      try {
        setIrcamLoading(true);
        setIrcamError("");

        const res = await fetch(
          `http://localhost:5000/api/ircam/result/${ircamJobId}`
        );
        if (!res.ok) {
          throw new Error(`IRCAM result failed with status ${res.status}`);
        }

        const json = await res.json();
        if (cancelled) return;

        setIrcamResult(json);

        // if backend normalized, we can stop after first success
        if (json.status === "success" || json.status === "failed") {
          setIrcamLoading(false);
          return;
        }

        setTimeout(pollOnce, INTERVAL_MS);
      } catch (e) {
        console.error(e);
        if (!cancelled) {
          setIrcamError("Could not load IRCAM result.");
          setIrcamLoading(false);
        }
      }
    }

    pollOnce();
    return () => {
      cancelled = true;
    };
  }, [ircamJobId]);

  // ---------- AI or Not display ----------
  const aiProb = Number(aiResult?.ai_probability ?? 0);
  const aiHumanPct = Math.round((1 - aiProb) * 100);
  const aiAiPct = Math.round(aiProb * 100);

  // ---------- IRCAM display ----------
  const irAiProb = Number(ircamResult?.ai_probability ?? 0);
  const irHumanPct =
    ircamResult?.ai_probability == null
      ? null
      : Math.round((1 - irAiProb) * 100);
  const irAiPct =
    ircamResult?.ai_probability == null
      ? null
      : Math.round(irAiProb * 100);

  // ---------- CYANITE mood ----------
  const analysis = cyanite?.audioAnalysisV6 || cyanite?.audioAnalysisV7;
  const cyStatus = analysis?.__typename;
  const cyFinished =
    cyStatus === "AudioAnalysisV6Finished" ||
    cyStatus === "AudioAnalysisV7Finished";

  const cyMoodTags =
    cyFinished && analysis?.result?.moodTags
      ? analysis.result.moodTags
      : [];

  return (
    <section className="result-page">
      <div className="result-card">
        <h2 className="h2">Analysis Results</h2>

        {/* AI OR NOT */}
        <section style={{ marginTop: "1.5rem" }}>
          <h3 className="h3">AI or Not</h3>
          {aiLoading && <p className="muted">Loading AI or Not result…</p>}
          {aiError && <p className="error">{aiError}</p>}
          {aiResult && !aiLoading && (
            <>
              <p className="muted">
                Human probability: <strong>{aiHumanPct}%</strong>, AI probability:{" "}
                <strong>{aiAiPct}%</strong>
              </p>
              <details className="details">
                <summary>Raw AI or Not response</summary>
                <pre className="pre">
                  {JSON.stringify(aiResult, null, 2)}
                </pre>
              </details>
            </>
          )}
        </section>

        {/* IRCAM */}
        <section style={{ marginTop: "1.5rem" }}>
          <h3 className="h3">IRCAM AI Music Detector</h3>
          {ircamLoading && (
            <p className="muted">Loading IRCAM detector result…</p>
          )}
          {ircamError && <p className="error">{ircamError}</p>}
          {ircamResult && !ircamLoading && (
            <>
              {irHumanPct != null ? (
                <p className="muted">
                  Human probability: <strong>{irHumanPct}%</strong>, AI probability:{" "}
                  <strong>{irAiPct}%</strong> (confidence:{" "}
                  {ircamResult.confidence}%)
                </p>
              ) : (
                <p className="muted">
                  No normalized probabilities found in IRCAM response.
                </p>
              )}
              <details className="details">
                <summary>Raw IRCAM response</summary>
                <pre className="pre">
                  {JSON.stringify(ircamResult.raw || ircamResult, null, 2)}
                </pre>
              </details>
            </>
          )}
        </section>

        {/* CYANITE */}
        <section style={{ marginTop: "1.5rem" }}>
          <h3 className="h3">Cyanite Mood</h3>
          {cyaniteLoading && (
            <p className="muted">Loading musical mood from Cyanite…</p>
          )}
          {cyaniteError && <p className="error">{cyaniteError}</p>}
          {cyanite && !cyaniteLoading && (
            <>
              <p className="muted">
                Status: <strong>{cyStatus || "Unknown"}</strong>
              </p>
              {cyFinished && cyMoodTags.length > 0 && (
                <p className="muted">
                  Primary mood tags:{" "}
                  <strong>{cyMoodTags.slice(0, 5).join(", ")}</strong>
                </p>
              )}
              <details className="details">
                <summary>Raw Cyanite audio analysis</summary>
                <pre className="pre">
                  {JSON.stringify(cyanite, null, 2)}
                </pre>
              </details>
            </>
          )}
        </section>

        <div className="actions center" style={{ marginTop: "2rem" }}>
          <button className="btn" onClick={onReset}>
            Analyze another track
          </button>
        </div>
      </div>
    </section>
  );
}
