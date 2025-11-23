// config.example.js (CommonJS)
module.exports = {
  provider: "aiornot",
  aiornot: {
    apiUrl: "https://api.aiornot.com/v1/reports/music",
    // Choose one:
    apiKey: process.env.AIORNOT_API_KEY,
    // or provide via env: AIORNOT_API_KEY
  },
  cyanite: {
    apiUrl: process.env.CYANITE_API_URL,
    apiKey: process.env.CYANITE_ACCESS_TOKEN
  },
};
