// integrations/ircam.js - IRCAM AI Music Detector integration (CommonJS)
const fs = require("fs");
const path = require("path");

// node-fetch wrapper for CommonJS (same pattern as cyanite.js)
const fetch = (...args) =>
  import("node-fetch").then(({ default: fetch }) => fetch(...args));

const AUTH_URL =
  process.env.IRCAM_AUTH_URL || "https://api.ircamamplify.io/oauth/token";
const API_BASE_URL =
  process.env.IRCAM_API_BASE_URL || "https://api.ircamamplify.io";
const STORAGE_BASE_URL =
  process.env.IRCAM_STORAGE_BASE_URL || "https://storage.ircamamplify.io";

const CLIENT_ID = process.env.IRCAM_CLIENT_ID;
const CLIENT_SECRET = process.env.IRCAM_CLIENT_SECRET;

// Simple in-memory token cache
let cachedToken = null;
let cachedTokenExpiresAt = 0;

/**
 * Get a JWT id_token using client_credentials.
 * This token is used for IAS storage + AI Music Detector.
 */
async function getIdToken() {
  if (!CLIENT_ID || !CLIENT_SECRET) {
    throw new Error("Missing IRCAM_CLIENT_ID or IRCAM_CLIENT_SECRET");
  }

  const now = Date.now();
  if (cachedToken && cachedTokenExpiresAt > now + 5000) {
    return cachedToken;
  }

  const payload = {
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
    grant_type: "client_credentials",
  };

  const res = await fetch(AUTH_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(
      `IRCAM auth failed: ${res.status} ${res.statusText} ${text}`
    );
  }

  const json = await res.json();
  const token = json.id_token;

  if (!token) {
    throw new Error("IRCAM auth response missing id_token");
  }

  // Assume ~50 minutes validity
  cachedToken = token;
  cachedTokenExpiresAt = now + 50 * 60 * 1000;

  return token;
}

/**
 * Create an IAS object (returns its id/ulid).
 */
async function createIasObject(idToken) {
  const res = await fetch(`${STORAGE_BASE_URL}/manager/`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${idToken}`,
    },
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(
      `IRCAM IAS manager create failed: ${res.status} ${res.statusText} ${text}`
    );
  }

  const json = await res.json();
  const id = json.id || json.ulid || json.iasId;

  if (!id) {
    throw new Error(
      `IRCAM IAS manager response missing id: ${JSON.stringify(json)}`
    );
  }

  return id;
}

/**
 * Upload local file bytes into IAS object.
 */
async function uploadToIas(idToken, iasId, filePath) {
  const fileName = path.basename(filePath);
  const url = `${STORAGE_BASE_URL}/${encodeURIComponent(
    iasId
  )}/${encodeURIComponent(fileName)}`;

  const buffer = fs.readFileSync(filePath);

  const res = await fetch(url, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${idToken}`,
      "Content-Type": "application/octet-stream",
    },
    body: buffer,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(
      `IRCAM IAS upload failed: ${res.status} ${res.statusText} ${text}`
    );
  }
}

/**
 * Start AI Music Detector job for a given audioUrl (ias://...).
 */
async function startDetectorJob(idToken, audioUrl) {
  const url = `${API_BASE_URL}/aidetector/`;

  const body = {
    audioUrlList: [audioUrl],
    timeAnalysis: false, // set true if you want time-resolved analysis
  };

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(
      `IRCAM aidetector start failed: ${res.status} ${res.statusText} ${text}`
    );
  }

  const json = await res.json();
  const id = json.id;

  if (!id) {
    throw new Error(
      `IRCAM aidetector start response missing id: ${JSON.stringify(json)}`
    );
  }

  return id;
}

/**
 * Public: start analysis from a LOCAL file path.
 * 1. get id_token
 * 2. create IAS object
 * 3. upload file to IAS
 * 4. start /aidetector/ job
 */
async function startIrcamAnalysis(filePath) {
  const idToken = await getIdToken();
  const iasId = await createIasObject(idToken);
  await uploadToIas(idToken, iasId, filePath);

  const audioUrl = `ias://${iasId}`;
  const jobId = await startDetectorJob(idToken, audioUrl);

  return { jobId, audioUrl };
}

/**
 * Public: fetch AI Music Detector job result (raw).
 */
async function getIrcamResult(jobId) {
  const idToken = await getIdToken();
  const url = `${API_BASE_URL}/aidetector/${encodeURIComponent(jobId)}`;

  const res = await fetch(url, {
    method: "GET",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${idToken}`,
    },
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(
      `IRCAM aidetector get failed: ${res.status} ${res.statusText} ${text}`
    );
  }

  const json = await res.json();
  return json;
}

module.exports = {
  startIrcamAnalysis,
  getIrcamResult,
};
