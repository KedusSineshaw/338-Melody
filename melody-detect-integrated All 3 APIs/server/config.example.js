// config.js (CommonJS)
module.exports = {
  provider: "aiornot",

  aiornot: {
    apiUrl: "https://api.aiornot.com/v1/reports/music",
    apiKey: process.env.AIORNOT_API_KEY,
  },

  cyanite: {
    apiUrl: process.env.CYANITE_API_URL,
    apiKey: process.env.CYANITE_ACCESS_TOKEN,
  },

  // 🔹 NEW: IRCAM config (used by detectWithIrcam, but optional)
  ircam: {
    apiUrl: process.env.IRCAM_API_URL,   // e.g. https://api.ircamamplify.io/v1/detect
    apiKey: process.env.IRCAM_API_KEY,
  },
};
