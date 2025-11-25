// integrations/aiornot.js (CommonJS)
const fs = require("fs");
const FormData = require("form-data");
const fetch = require("node-fetch");

/**
 * Calls AI or Not Music endpoint with multipart/form-data.
 * Returns { ai_probability, raw } where ai_probability is in [0,1].
 *
 * cfg.aiornot: { apiUrl, apiKey }
 * Falls back to process.env.AIORNOT_API_KEY.
 */
async function detect(filePath, cfg = {}) {
  const conf = cfg.aiornot || {};
  const API_KEY = (conf.apiKey || process.env.AIORNOT_API_KEY || "").trim();
  const MUSIC_ENDPOINT = conf.apiUrl || "https://api.aiornot.com/v1/reports/music";

  if (!API_KEY) throw new Error("AIORNOT_API_KEY missing (set in config or environment)");

  const form = new FormData();
  form.append("file", fs.createReadStream(filePath)); // field name must be "file"

  // Get form headers first, then ensure Authorization is set correctly
  const formHeaders = form.getHeaders();
  const res = await fetch(MUSIC_ENDPOINT, {
    method: "POST",
    headers: {
      ...formHeaders,
      Authorization: `Bearer ${API_KEY}`,
    },
    body: form,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`AI or Not failed: ${res.status} ${res.statusText} ${text}`);
  }

  const json = await res.json();

  // Normalize to [0,1] for your UI
  const verdict = json?.report?.verdict;
  const confidence =
    typeof json?.report?.confidence === "number" ? json.report.confidence : 0.5;

  // Probability that it's AI-generated
  const aiProb = verdict === "ai" ? confidence : 1 - confidence;

  return { ai_probability: aiProb, raw: json };
}

module.exports = { detect };
