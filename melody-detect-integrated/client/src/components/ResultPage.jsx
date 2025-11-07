import { useEffect, useState } from "react";

export default function ResultPage({ jobId, onReset }) {
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchResult() {
      try {
        const res = await fetch(`http://localhost:5000/api/results/${jobId}`);
        if (!res.ok) throw new Error("Failed to fetch results");
        const json = await res.json();
        setResult(json);
      } catch (e) {
        console.error(e);
        setError("Could not load results. Try again.");
      }
    }
    fetchResult();
  }, [jobId]);

  if (error) return (
    <div>
      <h2>Authenticity Result</h2>
      <p className="error">{error}</p>
      <button onClick={onReset}>Upload New File</button>
    </div>
  );

  if (!result) return <p>Loading...</p>;

  const score = Math.round((1 - result.ai_probability) * 100);

  return (
    <div>
      <h2>Authenticity Result</h2>
      <p>This track is <strong>{score}% human-made</strong>.</p>
      <button onClick={onReset}>Upload New File</button>
    </div>
  );
}
