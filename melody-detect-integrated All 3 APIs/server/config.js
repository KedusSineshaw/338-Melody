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

  ircam: {
    clientId: process.env.IRCAM_CLIENT_ID,
    clientSecret: process.env.IRCAM_CLIENT_SECRET,
    tokenUrl: process.env.IRCAM_TOKEN_URL,
    baseUrl: process.env.IRCAM_BASE_URL,
  },
};
