// server/integrations/cyanite.js

const fs = require("fs");

// node-fetch v3 is ESM; wrap it so we can require() it from CommonJS
const fetch = (...args) =>
  import("node-fetch").then(({ default: fetch }) => fetch(...args));

const API_URL = process.env.CYANITE_API_URL || "https://api.cyanite.ai/graphql";
const ACCESS_TOKEN = process.env.CYANITE_ACCESS_TOKEN;

console.log(
  "[Cyanite] token prefix:",
  (ACCESS_TOKEN || "").slice(0, 10)
);

/**
 * Generic GraphQL helper
 */
async function gql(query, variables = {}) {
  if (!ACCESS_TOKEN) {
    throw new Error("Missing CYANITE_ACCESS_TOKEN");
  }

  const res = await fetch(API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${ACCESS_TOKEN}`,
    },
    body: JSON.stringify({ query, variables }),
  });

  const json = await res.json();

  if (json.errors && json.errors.length > 0) {
    throw new Error(
      "Cyanite GraphQL error: " + JSON.stringify(json.errors)
    );
  }

  return json.data;
}

/**
 * Step 1 — Ask Cyanite for upload URL
 */
async function requestUpload() {
  const query = `
    mutation FileUploadRequest {
      fileUploadRequest {
        id
        uploadUrl
      }
    }
  `;

  const data = await gql(query);
  if (!data || !data.fileUploadRequest) {
    throw new Error("fileUploadRequest returned no data");
  }
  return data.fileUploadRequest; // { id, uploadUrl }
}

/**
 * Step 2 — PUT file bytes to Cyanite S3
 */
async function uploadToS3(uploadUrl, filePath) {
  const buffer = fs.readFileSync(filePath);

  const res = await fetch(uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": "audio/mpeg" },
    body: buffer,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(
      `Upload to S3 failed: ${res.status} ${res.statusText} ${text}`
    );
  }
}

/**
 * Step 3 — Create a LibraryTrack (this triggers analysis)
 */
async function createLibraryTrack(uploadId, title) {
  const query = `
    mutation CreateLibraryTrack($input: LibraryTrackCreateInput!) {
      libraryTrackCreate(input: $input) {
        __typename

        ... on LibraryTrackCreateSuccess {
          createdLibraryTrack {
            id
            title
          }
          enqueueResult {
            __typename
          }
        }

        ... on LibraryTrackCreateError {
          code
          message
        }
      }
    }
  `;

  const variables = {
    input: {
      uploadId,
      title,
      externalId: uploadId, // optional but useful for your own mapping
    },
  };

  const data = await gql(query, variables);
  const res = data.libraryTrackCreate;

  if (!res) {
    throw new Error("libraryTrackCreate returned no data");
  }

  if (res.__typename === "LibraryTrackCreateError") {
    throw new Error(`Cyanite error: ${res.code} ${res.message}`);
  }

  return res.createdLibraryTrack; // { id, title }
}

/**
 * analyzeLocalFile(filePath)
 * Called by: POST /api/cyanite/analyze
 * Returns: { analysisId, status, track }
 */
async function analyzeLocalFile(filePath) {
  if (!ACCESS_TOKEN) {
    throw new Error("Missing CYANITE_ACCESS_TOKEN");
  }

  const fileName = filePath.split(/[\\/]/).pop();

  // Step 1: upload request
  const { id: uploadId, uploadUrl } = await requestUpload();

  // Step 2: upload file bytes
  await uploadToS3(uploadUrl, filePath);

  // Step 3: create LibraryTrack (enqueues analysis)
  const track = await createLibraryTrack(uploadId, fileName);

  return {
    analysisId: track.id,
    status: "ENQUEUED",
    track,
  };
}

/**
 * getInDepthAnalysis(id)
 * Called by: GET /api/cyanite/result/:id
 * Uses Audio Analysis V6 to get mood tags.
 */
async function getInDepthAnalysis(id) {
  const query = `
    query TrackQuery($id: ID!) {
      libraryTrack(id: $id) {
        __typename

        ... on LibraryTrackNotFoundError {
          message
        }

        ... on LibraryTrack {
          id
          title
          audioAnalysisV6 {
            __typename

            ... on AudioAnalysisV6Finished {
              result {
                moodTags          # simple moods
                moodAdvancedTags  # detailed moods
              }
            }

            ... on AudioAnalysisV6Failed {
              error {
                message
              }
            }
          }
        }
      }
    }
  `;

  const data = await gql(query, { id });
  return data.libraryTrack;
}

module.exports = {
  analyzeLocalFile,
  getInDepthAnalysis,
};
