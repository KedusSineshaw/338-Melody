import React, { useRef, useState } from "react";

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
      const data = new FormData();
      data.append("file", file);

      const xhr = new XMLHttpRequest();
      xhr.open("POST", "http://localhost:5000/api/upload");

      xhr.upload.onprogress = (evt) => {
        if (evt.lengthComputable) {
          const pct = Math.round((evt.loaded / evt.total) * 100);
          setProgress(pct);
        }
      };

      const result = await new Promise((resolve, reject) => {
        xhr.onreadystatechange = () => {
          if (xhr.readyState === 4) {
            if (xhr.status >= 200 && xhr.status < 300) resolve(xhr.responseText);
            else reject(new Error(`Upload failed with status ${xhr.status}`));
          }
        };
        xhr.onerror = () => reject(new Error("Network error while uploading."));
        xhr.send(data);
      });

      const json = JSON.parse(result || "{}");
      if (json.job_id) onUploaded(json.job_id);
      else setError("Unexpected server response. Try again.");
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