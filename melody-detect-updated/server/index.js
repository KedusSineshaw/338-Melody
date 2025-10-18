import express from "express";
import fileUpload from "express-fileupload";
import cors from "cors";
import fs from "fs";
import path from "path";

const app = express();
const PORT = 5000;

app.use(cors());
app.use(fileUpload());
app.use(express.json());

// Fix: create uploads in current server folder (not server/server/uploads)
const uploadsDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

// ---- Upload Endpoint ----
app.post("/api/upload", (req, res) => {
  if (!req.files || !req.files.file)
    return res.status(400).json({ error: "No file uploaded" });

  const file = req.files.file;
  const filePath = path.join(uploadsDir, file.name);
  file.mv(filePath, (err) => {
    if (err) return res.status(500).json({ error: "Upload failed" });

    const jobId = Date.now().toString();
    const result = {
      status: "done",
      ai_probability: Math.random(), // mock score for now
    };
    fs.writeFileSync(path.join(uploadsDir, `${jobId}.json`), JSON.stringify(result));
    res.json({ status: "uploaded", job_id: jobId });
  });
});

// ---- Result Endpoint ----
app.get("/api/results/:jobId", (req, res) => {
  const jobFile = path.join(uploadsDir, `${req.params.jobId}.json`);
  if (!fs.existsSync(jobFile))
    return res.status(404).json({ error: "Job not found" });

  const data = JSON.parse(fs.readFileSync(jobFile));
  res.json(data);
});

app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
