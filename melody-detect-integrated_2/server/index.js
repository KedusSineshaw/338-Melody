// server/index.js (CommonJS)
const express = require("express");
const fileUpload = require("express-fileupload");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
require("dotenv").config();

// Single config source
const cfg = require("./config.js");

const { detect } = require("./integrations/aiornot.js");
const { detect: detectIrcam } = require("./integrations/ircam.js");
const {
  analyzeLocalFile,
  getInDepthAnalysis,
} = require("./integrations/cyanite.js");

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(fileUpload());
app.use(express.json());

const uploadsDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

// Root route - API status
app.get("/", (req, res) => {
  res.json({
    status: "ok",
    message: "Melody Detect API Server",
    endpoints: {
      "POST /api/upload": "Upload file for AI or Not detection",
      "GET /api/results/:jobId": "Get AI or Not detection results",
      "POST /api/ircam/upload": "Upload file for Ircam Amplify detection",
      "GET /api/ircam/results/:jobId": "Get Ircam Amplify detection results",
      "POST /api/cyanite/analyze": "Upload file for Cyanite analysis",
      "GET /api/cyanite/result/:id": "Get Cyanite analysis results",
      "POST /api/cyanite/webhook": "Cyanite webhook endpoint"
    }
  });
});

/**
 * AI OR NOT
 * ----------
 */

// POST /api/upload — accepts multipart {file}, runs AI or Not, stores normalized JSON
app.post("/api/upload", (req, res) => {
  if (!req.files || !req.files.file)
    return res.status(400).json({ error: "No file uploaded" });

  const file = req.files.file;
  const filePath = path.join(uploadsDir, file.name);

  file.mv(filePath, async (err) => {
    if (err) return res.status(500).json({ error: "Upload failed" });

    const jobId = Date.now().toString();

    try {
      const result = await detect(filePath, cfg);
      const normalized = {
        status: "done",
        ai_probability: result.ai_probability, // 0..1 probability of being AI
        provider: "aiornot",
        raw: result.raw,
      };
      fs.writeFileSync(
        path.join(uploadsDir, `${jobId}.json`),
        JSON.stringify(normalized)
      );
      res.json({ status: "uploaded", job_id: jobId });
    } catch (e) {
      console.error("[AI or Not error]", e.message || e);
      res.status(502).json({ error: "Detection failed", details: e.message });
    }
  });
});

// GET /api/results/:jobId — returns saved AI or Not result
app.get("/api/results/:jobId", (req, res) => {
  const jobFile = path.join(uploadsDir, `${req.params.jobId}.json`);
  if (!fs.existsSync(jobFile))
    return res.status(404).json({ error: "Result not found" });
  res.json(JSON.parse(fs.readFileSync(jobFile)));
});

/**
 * IRCAM AMPLIFY
 * -------------
 */

// POST /api/ircam/upload — accepts multipart {file}, runs Ircam Amplify, stores normalized JSON
app.post("/api/ircam/upload", (req, res) => {
  if (!req.files || !req.files.file)
    return res.status(400).json({ error: "No file uploaded" });

  const file = req.files.file;
  const filePath = path.join(uploadsDir, file.name);

  file.mv(filePath, async (err) => {
    if (err) return res.status(500).json({ error: "Upload failed" });

    const jobId = Date.now().toString();

    try {
      const result = await detectIrcam(filePath, cfg);
      const normalized = {
        status: "done",
        ai_probability: result.ai_probability, // 0..1 probability of being AI
        provider: "ircam",
        raw: result.raw,
      };
      fs.writeFileSync(
        path.join(uploadsDir, `ircam_${jobId}.json`),
        JSON.stringify(normalized)
      );
      res.json({ status: "uploaded", job_id: jobId });
    } catch (e) {
      console.error("[Ircam Amplify error]", e.message || e);
      res.status(502).json({ error: "Detection failed", details: e.message });
    }
  });
});

// GET /api/ircam/results/:jobId — returns saved Ircam result
app.get("/api/ircam/results/:jobId", (req, res) => {
  const jobFile = path.join(uploadsDir, `ircam_${req.params.jobId}.json`);
  if (!fs.existsSync(jobFile))
    return res.status(404).json({ error: "Result not found" });
  res.json(JSON.parse(fs.readFileSync(jobFile)));
});

/**
 * CYANITE
 * --------
 */

// POST /api/cyanite/analyze — upload to Cyanite and start analysis
app.post("/api/cyanite/analyze", (req, res) => {
  if (!req.files || !req.files.file)
    return res.status(400).json({ error: "No file uploaded" });

  const file = req.files.file;
  const filePath = path.join(uploadsDir, file.name);

  file.mv(filePath, async (err) => {
    if (err) return res.status(500).json({ error: "Upload failed" });

    try {
      const { analysisId, status, track } = await analyzeLocalFile(filePath);
      res.json({ analysisId, status, track });
    } catch (e) {
      console.error("[Cyanite analyze error]", e);
      res
        .status(502)
        .json({ error: "Cyanite analyze failed", details: e.message });
    }
  });
});

// GET /api/cyanite/result/:id — poll analysis + mood from Cyanite
app.get("/api/cyanite/result/:id", async (req, res) => {
  try {
    const data = await getInDepthAnalysis(req.params.id);
    res.json(data);
  } catch (e) {
    console.error("[Cyanite result error]", e);
    res
      .status(502)
      .json({ error: "Cyanite fetch failed", details: e.message });
  }
});

/**
 * Optional: Webhook verification (if you use webhooks)
 */
app.post("/api/cyanite/webhook", (req, res) => {
  const secret = process.env.CYANITE_WEBHOOK_SECRET;
  const signature = req.headers["signature"];
  const bodyString = JSON.stringify(req.body);

  if (!secret || !signature) {
    console.log("[Cyanite webhook] No signature (likely test event):", req.body);
    return res.status(200).end();
  }

  try {
    const hmac = crypto.createHmac("sha512", secret);
    hmac.update(bodyString);
    const expected = hmac.digest("hex");

    if (signature !== expected) {
      console.warn("❌ Invalid Cyanite webhook signature");
      return res.status(401).end();
    }

    console.log("✅ Verified Cyanite webhook:", req.body);
    res.status(200).end();
  } catch (err) {
    console.error("Webhook verification error", err);
    res.status(400).end();
  }
});

app.listen(PORT, () =>
  console.log(`✅ Server running on http://localhost:${PORT}`)
);
