import React, { useEffect, useState } from "react";

export default function ResultPage({ jobId, ircamJobId, onReset }) {
  // AI OR NOT
  const [aiResult, setAiResult] = useState(null);
  const [aiError, setAiError] = useState("");
  const [aiLoading, setAiLoading] = useState(true);

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
        const res = await fetch(`http://localhost:5001/api/results/${jobId}`);
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
          `http://localhost:5001/api/ircam/result/${ircamJobId}`
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

  // Get top 3 generators if AI probability > 50%
  const getTopGenerators = () => {
    if (aiProb <= 0.5 || !aiResult?.raw?.report?.generator) {
      return null;
    }

    const generators = aiResult.raw.report.generator;
    // Convert to array of [name, probability] pairs and sort by probability (descending)
    const sorted = Object.entries(generators)
      .map(([name, prob]) => [name, Number(prob)])
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3); // Get top 3

    return sorted;
  };

  const topGenerators = getTopGenerators();

  // Format generator name for display
  const formatGeneratorName = (name) => {
    return name
      .split(/[-_]/)
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

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

  // Get suspected model if AI probability > 50%
  const getSuspectedModel = () => {
    if (irAiProb <= 0.5 || !ircamResult?.raw?.job_infos?.report_info?.report?.resultList?.[0]?.suspectedModel) {
      return null;
    }
    return ircamResult.raw.job_infos.report_info.report.resultList[0].suspectedModel;
  };

  const suspectedModel = getSuspectedModel();

  // Format suspected model name for display
  const formatModelName = (name) => {
    return name
      .replace(/([A-Z])/g, " $1") // Add space before capital letters
      .trim()
      .split(" ")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(" ");
  };

  // Determine conclusion based on both models
  const getConclusion = () => {
    const hasAiResult = aiResult && !aiLoading && aiProb !== null;
    const hasIrcamResult = ircamResult && !ircamLoading && irAiProb !== null;

    // Wait for at least one result
    if (!hasAiResult && !hasIrcamResult) {
      return null;
    }

    // If both results are available
    if (hasAiResult && hasIrcamResult) {
      const aiSaysAi = aiProb > 0.5;
      const ircamSaysAi = irAiProb > 0.5;

      if (!aiSaysAi && !ircamSaysAi) {
        return "The music is most likely human-generated!";
      } else if (aiSaysAi && ircamSaysAi) {
        return "The music is most likely AI-generated!";
      } else {
        return "The models have conflicting results.";
      }
    }

    // If only one result is available
    if (hasAiResult) {
      return aiProb > 0.5 
        ? "The music is most likely AI-generated!" 
        : "The music is most likely human-generated!";
    }

    if (hasIrcamResult) {
      return irAiProb > 0.5 
        ? "The music is most likely AI-generated!" 
        : "The music is most likely human-generated!";
    }

    return null;
  };

  const conclusion = getConclusion();

  return (
    <section className="result-page">
      <div className="result-card">
        <h2 className="h2">Analysis Results</h2>
        {conclusion && (
          <p style={{ 
            marginTop: "0.75rem", 
            marginBottom: "0", 
            fontSize: "1.1rem", 
            fontWeight: "600",
            color: "white"
          }}>
            {conclusion}
          </p>
        )}

        {/* AI OR NOT */}
        <section style={{ marginTop: "1.5rem" }}>
          <h3 className="h3" style={{ color: "white" }}>AI or Not</h3>
          {aiLoading && <p className="muted">Loading AI or Not result…</p>}
          {aiError && <p className="error">{aiError}</p>}
          {aiResult && !aiLoading && (
            <>
              <p className="muted">
                Human probability: <strong>{aiHumanPct}%</strong>, AI probability:{" "}
                <strong>{aiAiPct}%</strong>
              </p>
              {topGenerators && topGenerators.length > 0 && (
                <div style={{ marginTop: "1rem", color: "white" }}>
                  <p style={{ marginBottom: "0.5rem", color: "white" }}>
                    <strong>Top 3 Most Likely Generators:</strong>
                  </p>
                  <ol style={{ marginLeft: "0", paddingLeft: "1.25rem", marginTop: "0.5rem", color: "white", listStylePosition: "inside" }}>
                    {topGenerators.map(([name, prob], index) => (
                      <li key={name} style={{ marginBottom: "0.25rem", color: "white", paddingLeft: "0.25rem" }}>
                        <strong>{formatGeneratorName(name)}</strong> (
                        {(prob * 100).toFixed(2)}%)
                      </li>
                    ))}
                  </ol>
                </div>
              )}
            </>
          )}
        </section>

        {/* IRCAM */}
        <section style={{ marginTop: "1.5rem" }}>
          <h3 className="h3" style={{ color: "white" }}>IRCAM AI Music Detector</h3>
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
              {suspectedModel && (
                <div style={{ marginTop: "1rem", color: "white" }}>
                  <p style={{ marginBottom: "0.5rem", color: "white" }}>
                    <strong>Suspected Model:</strong> {formatModelName(suspectedModel)}
                  </p>
                </div>
              )}
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
