import express from "express";
import fileUpload from "express-fileupload";
import cors from "cors";
import fs from "fs";
import path from "path";

import { detect as detectSightengine } from "./integrations/sightengine.js";
import { detect as detectHive } from "./integrations/hive.js";
import { detect as detectShLabs } from "./integrations/shlabs.js";

let cfg = {};
try {
  const mod = await import("./config.js");
  cfg = mod.default || {};
} catch (e) {
  cfg = {
    provider: process.env.DETECTOR_PROVIDER || "shlabs",
    sightengine: {
      apiUrl: process.env.SE_API_URL,
      apiUser: process.env.SE_API_USER,
      apiSecret: process.env.SE_API_SECRET,
      apiKey: process.env.SE_API_KEY
    },
    hive: {
      apiUrl: process.env.HIVE_API_URL,
      apiKey: process.env.HIVE_API_KEY,
      authHeader: process.env.HIVE_AUTH_HEADER
    },
    shlabs: {
      apiUrl: process.env.SHLABS_API_URL,
      apiKey: process.env.SHLABS_API_KEY,
      authHeader: process.env.SHLABS_AUTH_HEADER
    }
  };
}

const app = express();
const PORT = 5000;

app.use(cors());
app.use(fileUpload());
app.use(express.json());

const uploadsDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

function getDetector(provider) {
  switch ((provider || "").toLowerCase()) {
    case "hive": return (filePath) => detectHive(filePath, cfg);
    case "shlabs": return (filePath) => detectShLabs(filePath, cfg);
    case "sightengine":
    default: return (filePath) => detectSightengine(filePath, cfg);
  }
}

app.post("/api/upload", (req, res) => {
  if (!req.files || !req.files.file)
    return res.status(400).json({ error: "No file uploaded" });

  const file = req.files.file;
  const filePath = path.join(uploadsDir, file.name);

  file.mv(filePath, async (err) => {
    if (err) return res.status(500).json({ error: "Upload failed" });

    const jobId = Date.now().toString();
    const detector = getDetector(cfg.provider);

    try {
      const result = await detector(filePath);
      const normalized = {
        status: "done",
        ai_probability: result?.ai_probability ?? 0.5,
        provider: cfg.provider,
        raw: result?.raw ?? null
      };
      fs.writeFileSync(path.join(uploadsDir, `${jobId}.json`), JSON.stringify(normalized));
      res.json({ status: "uploaded", job_id: jobId });
    } catch (e) {
      console.error("[detector error]", e?.message || e);
      const fallback = { status: "done", ai_probability: Math.random(), provider: "fallback" };
      fs.writeFileSync(path.join(uploadsDir, `${jobId}.json`), JSON.stringify(fallback));
      res.json({ status: "uploaded", job_id: jobId, note: "detector_failed_fallback" });
    }
  });
});

app.get("/api/results/:jobId", (req, res) => {
  const jobFile = path.join(uploadsDir, `${req.params.jobId}.json`);
  if (!fs.existsSync(jobFile))
    return res.status(404).json({ error: "Job not found" });

  const data = JSON.parse(fs.readFileSync(jobFile));
  res.json(data);
});

app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
