import fs from "fs";
import FormData from "form-data";
import fetch from "node-fetch";
export async function detect(filePath, cfg = {}) {
  const conf = cfg?.shlabs || {};
  if (!conf.apiUrl) throw new Error("SH.Labs apiUrl is required");
  const form = new FormData();
  form.append("file", fs.createReadStream(filePath));
  const headers = form.getHeaders();
  if (conf.authHeader) headers["Authorization"] = conf.authHeader;
  else if (conf.apiKey) headers["X-Api-Key"] = conf.apiKey;
  const res = await fetch(conf.apiUrl, { method: "POST", headers, body: form });
  if (!res.ok) throw new Error(`SH.Labs API failed: ${res.status}`);
  const json = await res.json();
  const aiProb = typeof json?.ai_probability === "number" ? json.ai_probability
                : (typeof json?.score === "number" ? json.score : 0.5);
  return { ai_probability: aiProb, raw: json };
}
