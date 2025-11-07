import fs from "fs";
import FormData from "form-data";
import fetch from "node-fetch";
export async function detect(filePath, cfg = {}) {
  const conf = cfg?.sightengine || {};
  if (!conf.apiUrl) throw new Error("Sightengine apiUrl is required");
  const form = new FormData();
  form.append("media", fs.createReadStream(filePath));
  if (conf.apiUser && conf.apiSecret) {
    form.append("api_user", conf.apiUser);
    form.append("api_secret", conf.apiSecret);
  }
  const headers = form.getHeaders();
  if (conf.apiKey && !conf.apiUser) headers["Authorization"] = `Bearer ${conf.apiKey}`;
  const res = await fetch(conf.apiUrl, { method: "POST", headers, body: form });
  if (!res.ok) throw new Error(`Sightengine API failed: ${res.status}`);
  const json = await res.json();
  let aiProb = 0.5;
  if (json?.type?.ai_generated !== undefined) aiProb = json.type.ai_generated;
  else if (json?.result?.ai_probability !== undefined) aiProb = json.result.ai_probability;
  else if (typeof json?.ai_probability === "number") aiProb = json.ai_probability;
  return { ai_probability: aiProb, raw: json };
}
