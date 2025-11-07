import { useState } from "react";

export default function FileUploader({ onUploaded }) {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleUpload() {
    if (!file) {
      setError("Please choose a file before uploading.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const data = new FormData();
      data.append("file", file);
      const res = await fetch("http://localhost:5000/api/upload", {
        method: "POST",
        body: data,
      });
      if (!res.ok) throw new Error(`Upload failed with status ${res.status}`);
      const json = await res.json();
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
    <div style={{ textAlign: "center" }}>
      <h2>Upload Your Track</h2>
      <input
        type="file"
        accept="audio/*"
        onChange={(e) => setFile(e.target.files[0])}
        disabled={loading}
      />
      <br />
      <button onClick={handleUpload} disabled={loading}>
        {loading ? "Uploading..." : "Upload"}
      </button>

      {loading && <div className="spinner" />}
      {error && <p className="error">{error}</p>}
    </div>
  );
}
