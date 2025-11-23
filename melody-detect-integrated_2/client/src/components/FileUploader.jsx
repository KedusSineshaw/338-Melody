import React, { useRef, useState } from "react";
import { API_BASE_URL } from "../config";

export default function FileUploader({ onUploaded, onBack }) {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [progress, setProgress] = useState(0);
  const inputRef = useRef(null);

  function onSelectFile(f) {
    if (!f) return;
    setFile(f);
    setError("");
  }

  function handleDrop(e) {
    e.preventDefault();
    e.stopPropagation();
    const f = e.dataTransfer.files?.[0];
    onSelectFile(f);
  }

  function handleDragOver(e) {
    e.preventDefault();
  }

  function openFileDialog() {
    inputRef.current?.click();
  }

async function handleUpload() {
  if (!file) {
    setError("Please choose a file before uploading.");
    return;
  }
  setError("");
  setLoading(true);
  setProgress(0);

  try {
    // ----------------------------
    // 1) Upload to AI OR NOT
    // ----------------------------
    const data = new FormData();
    data.append("file", file);

    const xhr = new XMLHttpRequest();
    xhr.open("POST", `${API_BASE_URL}/api/upload`);

    xhr.upload.onprogress = (evt) => {
      if (evt.lengthComputable) {
        const pct = Math.round((evt.loaded / evt.total) * 100);
        setProgress(pct);
      }
    };

    const aiOrNotResponse = await new Promise((resolve, reject) => {
      xhr.onreadystatechange = () => {
        if (xhr.readyState === 4) {
          if (xhr.status >= 200 && xhr.status < 300) resolve(xhr.responseText);
          else reject(new Error(`Upload failed with status ${xhr.status}`));
        }
      };
      xhr.onerror = () =>
        reject(new Error("Network error while uploading to AI or Not."));
      xhr.send(data);
    });

    const aiJson = JSON.parse(aiOrNotResponse || "{}");
    if (!aiJson.job_id) throw new Error("AI or Not returned no job_id");

    const jobId = aiJson.job_id;

    // ----------------------------
    // 2) Upload SAME FILE to CYANITE
    // ----------------------------
    const cyForm = new FormData();
    cyForm.append("file", file);

    const cyRes = await fetch(`${API_BASE_URL}/api/cyanite/analyze`, {
      method: "POST",
      body: cyForm,
    });

    if (!cyRes.ok) throw new Error("Cyanite analysis request failed");
    const cyJson = await cyRes.json();

    const cyaniteId = cyJson.analysisId;

    // ----------------------------
    // 3) Upload SAME FILE to IRCAM AMPLIFY
    // ----------------------------
    const ircamForm = new FormData();
    ircamForm.append("file", file);

    const ircamRes = await fetch(`${API_BASE_URL}/api/ircam/upload`, {
      method: "POST",
      body: ircamForm,
    });

    if (!ircamRes.ok) throw new Error("Ircam Amplify analysis request failed");
    const ircamJson = await ircamRes.json();

    const ircamJobId = ircamJson.job_id;

    // ----------------------------
    // Return ALL IDs to the parent
    // ----------------------------
    onUploaded(jobId, cyaniteId, ircamJobId);

  } catch (err) {
    console.error(err);
    setError("Something went wrong while uploading. Please try again.");
  } finally {
    setLoading(false);
  }
}


  return (
    <section className="upload-page full-screen-bg">
      <header className="topbar">
        <button className="btn btn-ghost" onClick={onBack} disabled={loading}>
          ← Back
        </button>
        <div className="brand mini">
          <span className="logo-dot" />
          <span className="brand-text">Melody Detect</span>
        </div>
        <div />
      </header>

      <div className="upload-card">
        <h2 className="h2">Upload your track</h2>
        <p className="muted">
          MP3, WAV, M4A, FLAC and other common audio formats are supported.
        </p>

        <div
          className={`dropzone ${loading ? "disabled" : ""}`}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onClick={openFileDialog}
          role="button"
          aria-label="Choose an audio file to upload"
          tabIndex={0}
          onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && openFileDialog()}
        >
          <input
            type="file"
            accept="audio/*"
            ref={inputRef}
            onChange={(e) => onSelectFile(e.target.files?.[0])}
            disabled={loading}
            style={{ display: "none" }}
          />

          {!file && (
            <div className="dropzone-empty">
              <div className="icon-circle" aria-hidden>
                ♪
              </div>
              <p><strong>Drag & drop</strong> your audio here, or click to browse</p>
              <p className="hint">Max size depends on your server settings</p>
            </div>
          )}

          {file && (
            <div className="file-chip" title={file.name}>
              <div className="file-meta">
                <span className="file-name">{file.name}</span>
                <span className="file-size">
                  {(file.size / (1024 * 1024)).toFixed(2)} MB
                </span>
              </div>
              <button
                className="btn btn-ghost sm"
                onClick={(e) => {
                  e.stopPropagation();
                  setFile(null);
                }}
                disabled={loading}
              >
                Remove
              </button>
            </div>
          )}
        </div>

        <div className="actions">
          <button className="btn btn-primary" onClick={handleUpload} disabled={loading}>
            {loading ? "Uploading…" : "Upload & Analyze"}
          </button>
          {loading && (
            <div className="progress" aria-label="Upload progress">
              <div className="progress-bar" style={{ width: `${progress}%` }} />
            </div>
          )}
        </div>

        {error && <p className="error" role="alert">{error}</p>}

        <ul className="bullets">
          <li>We never store your audio longer than needed to analyze.</li>
          <li>You’ll get a job ID to track results on the next screen.</li>
          <li>Results include a confidence score and key audio features.</li>
        </ul>
      </div>
    </section>
  );
}