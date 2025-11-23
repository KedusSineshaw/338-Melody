// index.js (CommonJS)

const express = require("express");
const fileUpload = require("express-fileupload");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
require("dotenv").config();

// Optional cfg used by AI or Not
cfg = {
  provider: "aiornot",
  aiornot: {
    apiUrl:
      process.env.AIORNOT_API_URL ||
      "https://api.aiornot.com/v1/reports/music",
    apiKey: process.env.AIORNOT_API_KEY,
  },
  cyanite: {
    apiUrl: process.env.CYANITE_API_URL || "https://api.cyanite.ai/graphql",
    apiKey: process.env.CYANITE_ACCESS_TOKEN,
  },
};

const { detect } = require("./integrations/aiornot.js");
const {
  analyzeLocalFile,
  getInDepthAnalysis,
} = require("./integrations/cyanite.js");
const {
  startIrcamAnalysis,
  getIrcamResult,
} = require("./integrations/ircam.js");

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(fileUpload());
app.use(express.json());

const uploadsDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

/**
 * AI OR NOT ROUTES
 * ----------------
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
 * CYANITE ROUTES
 * --------------
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
      // You can optionally store mapping jobId -> analysisId here
      res.json({ analysisId, status, track });
    } catch (e) {
      console.error("[Cyanite analyze error]", e);
      res
        .status(502)
        .json({ error: "Cyanite analyze failed", details: e.message });
    }
  });
});

// GET /api/cyanite/result/:id — poll analysis status/result from Cyanite
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

// POST /api/cyanite/webhook — Cyanite calls this when analysis finishes
app.post("/api/cyanite/webhook", (req, res) => {
  const secret = process.env.CYANITE_WEBHOOK_SECRET;
  const signature = req.headers["signature"]; // header name from docs
  const bodyString = JSON.stringify(req.body);

  // For dev / test events, Signature may be missing; accept them
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
    // TODO: store event or notify clients here

    res.status(200).end();
  } catch (err) {
    console.error("Webhook verification error", err);
    res.status(400).end();
  }
});

/**
 * IRCAM ROUTES
 * ------------
 */

// POST /api/ircam/analyze — upload file, send to IAS, start AI Music Detector job
app.post("/api/ircam/analyze", (req, res) => {
  if (!req.files || !req.files.file) {
    return res.status(400).json({ error: "No file uploaded" });
  }

  const file = req.files.file;
  const filePath = path.join(uploadsDir, file.name);

  file.mv(filePath, async (err) => {
    if (err) return res.status(500).json({ error: "Upload failed" });

    try {
      const { jobId, audioUrl } = await startIrcamAnalysis(filePath);
      console.log("[IRCAM] Started job:", jobId, "audioUrl:", audioUrl);

      res.json({
        status: "ENQUEUED",
        jobId,
        audioUrl,
        provider: "ircam",
      });
    } catch (e) {
      console.error("[IRCAM analyze error]", e);
      res.status(502).json({
        error: "IRCAM analyze failed",
        details: e.message,
      });
    }
  });
});

// GET /api/ircam/result/:id — fetch AI Music Detector result (normalized)
app.get("/api/ircam/result/:id", async (req, res) => {
  try {
    const data = await getIrcamResult(req.params.id);

    const job = data?.job_infos;
    const report = job?.report_info?.report;
    const first = report?.resultList?.[0];

    if (!first) {
      return res.json({
        status: job?.job_status || "unknown",
        ai_probability: null,
        human_probability: null,
        raw: data,
      });
    }

    const isAi = !!first.isAi;
    const conf = (first.confidence || 0) / 100;

    let ai_probability;
    let human_probability;

    if (isAi) {
      ai_probability = conf;
      human_probability = 1 - conf;
    } else {
      human_probability = conf;
      ai_probability = 1 - conf;
    }

    res.json({
      status: job?.job_status,
      filename: first.inputFilename,
      isAi,
      confidence: first.confidence,
      ai_probability,
      human_probability,
      raw: data,
    });
  } catch (e) {
    console.error("[IRCAM result error]", e);
    res.status(502).json({
      error: "IRCAM fetch failed",
      details: e.message,
    });
  }
});

app.listen(PORT, () =>
  console.log(`✅ Server running on http://localhost:${PORT}`)
);
