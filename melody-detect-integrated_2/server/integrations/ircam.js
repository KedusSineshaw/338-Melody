// integrations/ircam.js (CommonJS)
const fs = require("fs");
const FormData = require("form-data");
const fetch = require("node-fetch");

/**
 * Calls Ircam Amplify AI Music Detector endpoint with multipart/form-data.
 * Returns { ai_probability, raw } where ai_probability is in [0,1].
 *
 * cfg.ircam: { apiUrl, apiKey }
 * Falls back to process.env.IRCAM_API_KEY and process.env.IRCAM_API_URL.
 */
async function detect(filePath, cfg = {}) {
  const conf = cfg.ircam || {};
  const API_KEY = conf.apiKey || process.env.IRCAM_API_KEY;
  const API_URL = conf.apiUrl || process.env.IRCAM_API_URL || "https://api.ircamamplify.io/v1/detect";

  if (!API_KEY) throw new Error("IRCAM_API_KEY missing (set in config or environment)");
  if (!API_URL) throw new Error("IRCAM_API_URL missing (set in config or environment)");

  const form = new FormData();
  form.append("file", fs.createReadStream(filePath)); // field name may vary - adjust if needed

  const res = await fetch(API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      ...form.getHeaders()
    },
    body: form,
    timeout: 120000 // 120s timeout
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Ircam Amplify failed: ${res.status} ${res.statusText} ${text}`);
  }

  const json = await res.json();

  // Normalize to [0,1] for your UI
  // Adjust these paths based on actual Ircam API response structure
  let aiProb = 0.5; // default
  
  // Try different possible response structures
  if (typeof json?.ai_probability === "number") {
    aiProb = json.ai_probability;
  } else if (typeof json?.probability === "number") {
    aiProb = json.probability;
  } else if (typeof json?.confidence === "number") {
    aiProb = json.confidence;
  } else if (json?.result?.ai_probability !== undefined) {
    aiProb = json.result.ai_probability;
  } else if (json?.detection?.ai_probability !== undefined) {
    aiProb = json.detection.ai_probability;
  } else if (json?.verdict === "ai" && typeof json?.confidence === "number") {
    aiProb = json.confidence;
  } else if (json?.verdict === "human" && typeof json?.confidence === "number") {
    aiProb = 1 - json.confidence;
  }

  // Ensure it's between 0 and 1
  aiProb = Math.max(0, Math.min(1, aiProb));

  return { ai_probability: aiProb, raw: json };
}

module.exports = { detect };

