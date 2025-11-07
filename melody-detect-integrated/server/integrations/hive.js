import fs from "fs";
import FormData from "form-data";
import fetch from "node-fetch";
export async function detect(filePath, cfg = {}) {
  const conf = cfg?.hive || {};
  if (!conf.apiUrl) throw new Error("Hive apiUrl is required");
  const form = new FormData();
  form.append("media", fs.createReadStream(filePath));
  const headers = form.getHeaders();
  if (conf.authHeader) headers["Authorization"] = conf.authHeader;
  else if (conf.apiKey) headers["Authorization"] = `Bearer ${conf.apiKey}`;
  const res = await fetch(conf.apiUrl, { method: "POST", headers, body: form });
  if (!res.ok) throw new Error(`Hive API failed: ${res.status}`);
  const json = await res.json();
  let aiProb = 0.5;
  if (Array.isArray(json?.chunks) && json.chunks.length) {
    const vals = json.chunks.map(c => (typeof c.score === "number" ? c.score : null)).filter(v => v !== null);
    if (vals.length) aiProb = vals.reduce((a,b)=>a+b,0) / vals.length;
  } else if (typeof json?.ai_probability === "number") aiProb = json.ai_probability;
  return { ai_probability: aiProb, raw: json };
}
